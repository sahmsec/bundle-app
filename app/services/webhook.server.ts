/**
 * Webhook idempotency + retention.
 * Shopify guarantees at-least-once delivery, so we de-dupe on the unique
 * X-Shopify-Webhook-Id via the ProcessedWebhook ledger.
 */
import prisma from "../db.server";

const RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Returns true if this is the FIRST time we've seen the event id (i.e. process it). */
export async function recordWebhookOnce(
  eventId: string,
  topic: string,
  shopDomain: string,
): Promise<boolean> {
  try {
    await prisma.processedWebhook.create({ data: { id: eventId, topic, shopDomain } });
    return true;
  } catch {
    // Primary-key conflict -> already processed.
    return false;
  }
}

/** R4: prune the idempotency ledger; redeliveries arrive within hours. */
export async function pruneProcessedWebhooks(olderThanDays = RETENTION_DAYS): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * DAY_MS);
  const result = await prisma.processedWebhook.deleteMany({
    where: { processedAt: { lt: cutoff } },
  });
  return result.count;
}
