import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { Prisma, ShortUrlsTransactionalAdapter } from '@app/short-urls-db';

const PARTNER = 'GLOMO';

@Injectable()
export class WebhookEventsRepository {
  constructor(
    private readonly transactionHost: TransactionHost<ShortUrlsTransactionalAdapter>,
  ) {}

  async exists(dedupeKey: string) {
    const webhookEvent = await this.transactionHost.tx.webhookEvent.findUnique({
      where: { partner_dedupeKey: { partner: PARTNER, dedupeKey } },
      select: { id: true },
    });
    return webhookEvent !== null;
  }

  async record(webhookEvent: {
    dedupeKey: string;
    entityType: string;
    eventType: string;
    entityId: string | null;
    payload: Prisma.InputJsonValue;
  }) {
    const { count } = await this.transactionHost.tx.webhookEvent.createMany({
      data: [{ ...webhookEvent, partner: PARTNER }],
      skipDuplicates: true,
    });
    if (count === 0) return null;
    const created =
      await this.transactionHost.tx.webhookEvent.findUniqueOrThrow({
        where: {
          partner_dedupeKey: {
            partner: PARTNER,
            dedupeKey: webhookEvent.dedupeKey,
          },
        },
        select: { id: true },
      });
    return created.id;
  }

  markHandled(id: bigint, status: 'PROCESSED' | 'IGNORED') {
    return this.transactionHost.tx.webhookEvent.update({
      where: { id },
      data: { status, processedAt: new Date() },
    });
  }
}
