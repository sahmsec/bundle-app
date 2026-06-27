/**
 * Bundle repository — the ONLY place Prisma touches the Bundle table.
 *
 * Every method is TENANT-SCOPED by shopId. Mutations use updateMany with shopId
 * in the WHERE (never update({ where: { id } })) so a guessed id from another
 * shop can't mutate this tenant's data. This is the core multi-tenant safety net.
 */
import { Prisma } from "@prisma/client";
import type { Bundle, BundleStatus } from "@prisma/client";
import prisma from "../db.server";

export type BundleSortField = "createdAt" | "updatedAt" | "title";

export interface ListBundlesParams {
  shopId: string;
  q?: string;
  status?: BundleStatus;
  sort: BundleSortField;
  order: "asc" | "desc";
  skip: number;
  take: number;
}

export async function listBundles(
  p: ListBundlesParams,
): Promise<{ items: Bundle[]; total: number }> {
  const where: Prisma.BundleWhereInput = {
    shopId: p.shopId,
    deletedAt: null,
    ...(p.status ? { status: p.status } : {}),
    ...(p.q ? { title: { contains: p.q, mode: Prisma.QueryMode.insensitive } } : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.bundle.findMany({
      where,
      orderBy: { [p.sort]: p.order } as Prisma.BundleOrderByWithRelationInput,
      skip: p.skip,
      take: p.take,
    }),
    prisma.bundle.count({ where }),
  ]);

  return { items, total };
}

export function getBundleById(shopId: string, id: string): Promise<Bundle | null> {
  return prisma.bundle.findFirst({ where: { id, shopId, deletedAt: null } });
}

export function createBundle(data: Prisma.BundleUncheckedCreateInput): Promise<Bundle> {
  return prisma.bundle.create({ data });
}

export function updateBundle(
  shopId: string,
  id: string,
  data: Prisma.BundleUpdateInput,
): Promise<Prisma.BatchPayload> {
  return prisma.bundle.updateMany({ where: { id, shopId, deletedAt: null }, data });
}

export function softDeleteBundle(
  shopId: string,
  id: string,
): Promise<Prisma.BatchPayload> {
  // Preserve analytics history — mark deleted + archived rather than hard delete.
  return prisma.bundle.updateMany({
    where: { id, shopId, deletedAt: null },
    data: { deletedAt: new Date(), status: "ARCHIVED" },
  });
}

export function getBundleWithComponents(
  shopId: string,
  id: string,
): Promise<Prisma.BundleGetPayload<{ include: { components: true } }> | null> {
  return prisma.bundle.findFirst({
    where: { id, shopId, deletedAt: null },
    include: { components: { orderBy: [{ position: "asc" }] } },
  });
}

export function setSyncState(
  shopId: string,
  id: string,
  syncStatus: "PENDING" | "SYNCING" | "SYNCED" | "FAILED",
  syncError: string | null,
): Promise<Prisma.BatchPayload> {
  return prisma.bundle.updateMany({
    where: { id, shopId },
    data: { syncStatus, syncError },
  });
}

export function setPublished(
  shopId: string,
  id: string,
  shopifyProductId: string,
): Promise<Prisma.BatchPayload> {
  return prisma.bundle.updateMany({
    where: { id, shopId },
    data: {
      shopifyProductId,
      syncStatus: "SYNCED",
      status: "ACTIVE",
      publishedAt: new Date(),
      lastSyncedAt: new Date(),
      syncError: null,
    },
  });
}

/** Active bundles (with components) that include a given product — for storefront. */
export function findActiveBundlesForProduct(
  shopId: string,
  productId: string,
): Promise<Prisma.BundleGetPayload<{ include: { components: true } }>[]> {
  return prisma.bundle.findMany({
    where: {
      shopId,
      status: "ACTIVE",
      deletedAt: null,
      components: { some: { productId } },
    },
    include: { components: { orderBy: [{ position: "asc" }] } },
    take: 10,
  });
}

/** Map published bundle products back to bundles — for order webhook matching. */
export function findByShopifyProductIds(
  shopId: string,
  productIds: string[],
): Promise<{ id: string; shopifyProductId: string | null }[]> {
  return prisma.bundle.findMany({
    where: { shopId, deletedAt: null, shopifyProductId: { in: productIds } },
    select: { id: true, shopifyProductId: true },
  });
}

export async function handleExists(
  shopId: string,
  handle: string,
  exceptId?: string,
): Promise<boolean> {
  const found = await prisma.bundle.findFirst({
    where: {
      shopId,
      handle,
      deletedAt: null,
      ...(exceptId ? { NOT: { id: exceptId } } : {}),
    },
    select: { id: true },
  });
  return found !== null;
}
