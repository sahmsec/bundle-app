/** BundleSale repository — confirmed revenue from order webhooks. */
import type { Prisma } from "@prisma/client";
import prisma from "../db.server";

/** Idempotent at the row level too: the unique (orderId, bundleId) + skipDuplicates. */
export function createSales(
  data: Prisma.BundleSaleCreateManyInput[],
): Promise<Prisma.BatchPayload> {
  return prisma.bundleSale.createMany({ data, skipDuplicates: true });
}
