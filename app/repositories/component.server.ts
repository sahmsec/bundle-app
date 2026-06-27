/**
 * BundleComponent repository — the ONLY place Prisma touches components.
 *
 * Components have no shopId; they're scoped by bundleId. The SERVICE verifies
 * bundle ownership (getBundleById(shopId, bundleId)) before calling these, and
 * every mutation here additionally constrains by bundleId. Ownership is enforced
 * at the parent, inherited by the children.
 */
import type { Prisma, BundleComponent } from "@prisma/client";
import prisma from "../db.server";

export function listByBundle(bundleId: string): Promise<BundleComponent[]> {
  return prisma.bundleComponent.findMany({
    where: { bundleId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
}

export async function existingProductIds(bundleId: string): Promise<Set<string>> {
  const rows = await prisma.bundleComponent.findMany({
    where: { bundleId },
    select: { productId: true },
  });
  return new Set(rows.map((r) => r.productId));
}

export async function maxPosition(bundleId: string): Promise<number> {
  const agg = await prisma.bundleComponent.aggregate({
    where: { bundleId },
    _max: { position: true },
  });
  return agg._max.position ?? -1;
}

export function createMany(
  data: Prisma.BundleComponentCreateManyInput[],
): Promise<Prisma.BatchPayload> {
  return prisma.bundleComponent.createMany({ data });
}

export function updateQuantity(
  bundleId: string,
  id: string,
  quantity: number,
): Promise<Prisma.BatchPayload> {
  return prisma.bundleComponent.updateMany({
    where: { id, bundleId },
    data: { quantity },
  });
}

export function remove(bundleId: string, id: string): Promise<Prisma.BatchPayload> {
  return prisma.bundleComponent.deleteMany({ where: { id, bundleId } });
}
