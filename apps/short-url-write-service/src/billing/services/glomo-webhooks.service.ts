import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { ShortUrlsTransactionalAdapter } from '@app/short-urls-db';
import { GlomoPayment } from '../clients/glomo-payments.client';
import {
  GlomoSubscription,
  GlomoSubscriptionsClient,
} from '../clients/glomo-subscriptions.client';
import { InvalidSignatureError } from '../errors/invalid-signature.error';
import { BillingRepository } from '../repositories/billing.repository';
import { WebhookEventsRepository } from '../repositories/webhook-events.repository';
import { GlomoSignature } from '../utils/glomo-signature.util';
import { BillingSyncService } from './billing-sync.service';

interface GlomoWebhook {
  entity_type: string;
  event_type: string;
  data: { id?: string; subscription_id?: string | null };
}

@Injectable()
export class GlomoWebhooksService {
  constructor(
    private readonly glomoSignature: GlomoSignature,
    private readonly glomoSubscriptionsClient: GlomoSubscriptionsClient,
    private readonly billingRepository: BillingRepository,
    private readonly webhookEventsRepository: WebhookEventsRepository,
    private readonly billingSyncService: BillingSyncService,
    private readonly transactionHost: TransactionHost<ShortUrlsTransactionalAdapter>,
  ) {}

  async handle(rawBody: Buffer | undefined, signature: string | undefined) {
    if (!rawBody || !this.glomoSignature.isValidWebhook(rawBody, signature)) {
      throw new InvalidSignatureError();
    }
    const dedupeKey = createHash('sha256').update(rawBody).digest('hex');
    if (await this.webhookEventsRepository.exists(dedupeKey)) return;
    const webhook = JSON.parse(rawBody.toString('utf8')) as GlomoWebhook;
    const partnerSubscriptionId = this.subscriptionIdOf(webhook);
    const glomoSubscription = await this.subscriptionSnapshot(
      webhook,
      partnerSubscriptionId,
    );
    await this.transactionHost.withTransaction(async () => {
      const webhookEventId =
        await this.webhookEventsRepository.idempotentlyRecord({
          dedupeKey,
          entityType: webhook.entity_type,
          eventType: webhook.event_type,
          entityId: webhook.data.id ?? null,
          payload: webhook as object,
        });
      if (webhookEventId === null) return;
      const billingSubscription = partnerSubscriptionId
        ? await this.billingRepository.findByPartnerSubscriptionId(
            partnerSubscriptionId,
          )
        : null;
      if (!billingSubscription || !glomoSubscription) {
        await this.webhookEventsRepository.markHandled(
          webhookEventId,
          'IGNORED',
        );
        return;
      }
      let paidAt: Date | null = null;
      if (webhook.entity_type === 'payment') {
        const glomoPayment = webhook.data as GlomoPayment;
        await this.billingSyncService.recordPayment(
          billingSubscription.id,
          glomoPayment,
          glomoPayment['auto_debit?'] ? 'SUBSEQUENT' : 'FIRST',
        );
        paidAt = glomoPayment.paid_at ? new Date(glomoPayment.paid_at) : null;
      }
      await this.billingSyncService.applySubscriptionSnapshot(
        billingSubscription,
        glomoSubscription,
        paidAt,
      );
      await this.webhookEventsRepository.markHandled(
        webhookEventId,
        'PROCESSED',
      );
    });
  }

  private subscriptionIdOf(webhook: GlomoWebhook) {
    if (webhook.entity_type === 'subscription') return webhook.data.id ?? null;
    if (webhook.entity_type === 'payment') {
      return webhook.data.subscription_id ?? null;
    }
    return null;
  }

  private async subscriptionSnapshot(
    webhook: GlomoWebhook,
    partnerSubscriptionId: string | null,
  ) {
    if (!partnerSubscriptionId) return null;
    if (webhook.entity_type === 'subscription') {
      return webhook.data as GlomoSubscription;
    }
    if (
      !(await this.billingRepository.findByPartnerSubscriptionId(
        partnerSubscriptionId,
      ))
    ) {
      return null;
    }
    return this.glomoSubscriptionsClient.get(partnerSubscriptionId);
  }
}
