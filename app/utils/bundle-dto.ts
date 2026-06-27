/** Map Prisma Bundle models to serializable DTOs for loaders. */
import type { Bundle } from "@prisma/client";
import type { BundleDetail, BundleListItem } from "../types/bundle";

export function toBundleListItem(b: Bundle): BundleListItem {
  return {
    id: b.id,
    title: b.title,
    handle: b.handle,
    status: b.status,
    type: b.type,
    pricingType: b.pricingType,
    pricingValue: Number(b.pricingValue), // Decimal -> number for display only
    createdAt: b.createdAt.toISOString(),
  };
}

export function toBundleDetail(b: Bundle): BundleDetail {
  return {
    ...toBundleListItem(b),
    description: b.description,
    updatedAt: b.updatedAt.toISOString(),
    syncStatus: b.syncStatus,
    shopifyProductId: b.shopifyProductId,
    publishedAt: b.publishedAt ? b.publishedAt.toISOString() : null,
  };
}
