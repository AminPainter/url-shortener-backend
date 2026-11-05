import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransactionHost } from '@nestjs-cls/transactional';
import { ShortUrlsTransactionalAdapter } from '@app/short-urls-db';
import { PLANS } from '../../subscriptions/constants/plans';
import { SubscriptionsService } from '../../subscriptions/services/subscriptions.service';
import {
  UserAddress,
  UsersClient,
  UserProfile,
} from '../../users-client/clients/users.client';
import { GlomoCustomersClient } from '../clients/glomo-customers.client';
import { GlomoPaymentsClient } from '../clients/glomo-payments.client';
import { GlomoSubscriptionsClient } from '../clients/glomo-subscriptions.client';
import {
  GLOMO_INTERVAL_TYPES,
  GLOMO_MAX_BILLING_CYCLES,
  GLOMO_PRODUCT_DESCRIPTION,
  GLOMO_PRODUCT_NAMES,
} from '../constants/glomo';
import { ConfirmCheckoutDto } from '../dto/confirm-checkout.dto';
import { AlreadySubscribedError } from '../errors/already-subscribed.error';
import { InvalidSignatureError } from '../errors/invalid-signature.error';
import { ProfileIncompleteError } from '../errors/profile-incomplete.error';
import { BillingRepository } from '../repositories/billing.repository';
import { BillingLock } from '../utils/billing-lock.util';
import { GlomoSignature } from '../utils/glomo-signature.util';
import { BillingSyncService } from './billing-sync.service';

type PaidPlan = 'PRO' | 'BUSINESS';
type Interval = 'MONTH' | 'YEAR';

type CompleteUserProfile = UserProfile & { name: string; address: UserAddress };

@Injectable()
export class BillingService {
  constructor(
    private readonly billingRepository: BillingRepository,
    private readonly billingSyncService: BillingSyncService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly usersClient: UsersClient,
    private readonly glomoCustomersClient: GlomoCustomersClient,
    private readonly glomoSubscriptionsClient: GlomoSubscriptionsClient,
    private readonly glomoPaymentsClient: GlomoPaymentsClient,
    private readonly glomoSignature: GlomoSignature,
    private readonly billingLock: BillingLock,
    private readonly configService: ConfigService,
    private readonly transactionHost: TransactionHost<ShortUrlsTransactionalAdapter>,
  ) {}

  async startCheckout(userId: string, plan: PaidPlan, interval: Interval) {
    const userProfile = await this.usersClient.findById(userId);
    this.validateProfile(userProfile);
    return this.billingLock.withLock(userId, async () => {
      if (await this.billingRepository.findLiveSubscription(userId)) {
        throw new AlreadySubscribedError();
      }
      const today = this.utcDate(0);
      const pendingCheckout = await this.billingRepository.findPendingCheckout(
        userId,
        plan,
        interval,
        new Date(`${today}T00:00:00Z`),
      );
      if (pendingCheckout) {
        return this.checkoutSession(pendingCheckout.partnerSubscriptionId);
      }
      const customerId = await this.ensureCustomer(userId, userProfile);
      const prices = PLANS.find(
        (planDetails) => planDetails.plan === plan,
      )!.prices!;
      const glomoSubscription = await this.glomoSubscriptionsClient.create({
        customerId,
        productName: GLOMO_PRODUCT_NAMES[plan],
        productDescription: GLOMO_PRODUCT_DESCRIPTION,
        planName: `${GLOMO_PRODUCT_NAMES[plan]} ${interval === 'MONTH' ? 'Monthly' : 'Yearly'}`,
        amount: prices[interval],
        currency: prices.currency,
        intervalType: GLOMO_INTERVAL_TYPES[interval],
        billingCycles: GLOMO_MAX_BILLING_CYCLES[interval],
        startDate: today,
        expiresAt: this.utcDate(1),
        notes: { user_id: userId },
      });
      await this.billingRepository.createSubscription({
        userId,
        partnerSubscriptionId: glomoSubscription.id,
        plan,
        interval,
        amount: prices[interval],
        currency: prices.currency,
      });
      return this.checkoutSession(glomoSubscription.id);
    });
  }

  async confirmCheckout(
    userId: string,
    confirmCheckoutDto: ConfirmCheckoutDto,
  ) {
    const { subscriptionId, paymentId } = confirmCheckoutDto;
    const billingSubscription =
      await this.billingRepository.findUserSubscription(userId, subscriptionId);
    this.validateCheckoutSignature(confirmCheckoutDto);
    const [glomoPayment, glomoSubscription] = await Promise.all([
      this.glomoPaymentsClient.get(paymentId),
      this.glomoSubscriptionsClient.get(subscriptionId),
    ]);
    await this.transactionHost.withTransaction(async () => {
      await this.billingSyncService.recordPayment(
        billingSubscription.id,
        glomoPayment,
        'FIRST',
      );
      await this.billingSyncService.applySubscriptionSnapshot(
        billingSubscription,
        glomoSubscription,
        glomoPayment.paid_at ? new Date(glomoPayment.paid_at) : null,
      );
    });
    return this.subscriptionsService.getSubscription(userId);
  }

  async cancel(userId: string) {
    await this.billingLock.withLock(userId, async () => {
      const billingSubscription =
        await this.billingRepository.findCancellableSubscription(userId);
      await this.glomoSubscriptionsClient.cancel(
        billingSubscription.partnerSubscriptionId,
      );
      const glomoSubscription = await this.glomoSubscriptionsClient.get(
        billingSubscription.partnerSubscriptionId,
      );
      await this.transactionHost.withTransaction(() =>
        this.billingSyncService.applySubscriptionSnapshot(billingSubscription, {
          ...glomoSubscription,
          status: 'cancelled',
          cancelled_at: glomoSubscription.cancelled_at ?? this.utcDate(0),
        }),
      );
    });
    return this.subscriptionsService.getSubscription(userId);
  }

  private validateProfile(
    userProfile: UserProfile,
  ): asserts userProfile is CompleteUserProfile {
    if (!userProfile.name || !userProfile.address) {
      throw new ProfileIncompleteError();
    }
  }

  private validateCheckoutSignature({
    subscriptionId,
    paymentId,
    status,
    signature,
  }: ConfirmCheckoutDto) {
    if (
      !this.glomoSignature.isValidCheckout(
        subscriptionId,
        paymentId,
        status,
        signature,
      )
    ) {
      throw new InvalidSignatureError();
    }
  }

  private async ensureCustomer(
    userId: string,
    userProfile: CompleteUserProfile,
  ) {
    const existingCustomerId =
      await this.billingRepository.findPartnerCustomerId(userId);
    if (existingCustomerId) return existingCustomerId;
    const { name, address } = userProfile;
    const customerId = await this.glomoCustomersClient.ensure({
      name,
      email: userProfile.email,
      address: address.streetAddress,
      city: address.city,
      state: address.state,
      country: address.country,
      pincode: address.pincode,
    });
    await this.billingRepository.saveCustomer(userId, customerId);
    return customerId;
  }

  private checkoutSession(subscriptionId: string) {
    return {
      subscriptionId,
      publicKey: this.configService.getOrThrow<string>('GLOMO_PUBLIC_KEY'),
    };
  }

  private utcDate(daysFromToday: number) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + daysFromToday);
    return date.toISOString().slice(0, 10);
  }
}
