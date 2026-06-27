/**
 * Serializable bundle DTOs returned by loaders. We never hand the raw Prisma
 * model to the client — Decimal/Date don't serialize cleanly — so routes map
 * models to these plain shapes (see utils/bundle-dto).
 */
export interface BundleListItem {
  id: string;
  title: string;
  handle: string;
  status: string;
  type: string;
  pricingType: string;
  pricingValue: number;
  createdAt: string;
}

export interface BundleDetail extends BundleListItem {
  description: string | null;
  updatedAt: string;
  syncStatus: string;
  shopifyProductId: string | null;
  publishedAt: string | null;
}

export interface BundleListResult {
  items: BundleListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}
