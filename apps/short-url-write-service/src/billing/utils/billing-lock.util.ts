import { Injectable } from '@nestjs/common';
import { RedlockService } from '@app/lock';

const LOCK_TTL_MS = 15_000;
const LOCK_EXTENSION_THRESHOLD_MS = 2_000;

@Injectable()
export class BillingLock {
  constructor(private readonly redlockService: RedlockService) {}

  withLock<T>(userId: bigint, criticalSection: () => Promise<T>) {
    return this.redlockService.withLock(
      `lock:billing:user:${userId}`,
      LOCK_TTL_MS,
      criticalSection,
      { extensionThresholdMs: LOCK_EXTENSION_THRESHOLD_MS },
    );
  }
}
