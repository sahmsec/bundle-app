/**
 * Records BundleSale rows from an orders/create webhook payload.
 * Matches order line items (by product GID) against this shop's published
 * bundle products, aggregates per bundle, and writes idempotently.
 */
import * as bundleRepo from "../repositories/bundle.server";
import * as saleRepo from "../repositories/sale.server";
import { getShop } from "./shop.server";

interface OrderLineItem {
  product_id?: number | null;
  quantity?: number | null;
  price?: string | null;
}

export interface OrderWebhookPayload {
  id?: number | null;
  currency?: string | null;
  line_items?: OrderLineItem[] | null;
}

export async function recordBundleSalesFromOrder(
  shopDomain: string,
  payload: OrderWebhookPayload,
): Promise<void> {
  const lineItems = payload.line_items ?? [];
  if (!payload.id || lineItems.length === 0) return;

  const shop = await getShop(shopDomain);

  const productGids = [
    ...new Set(
      lineItems
        .filter((li) => li.product_id)
        .map((li) => `gid://shopify/Product/${li.product_id}`),
    ),
  ];
  if (productGids.length === 0) return;

  const matches = await bundleRepo.findByShopifyProductIds(shop.id, productGids);
  if (matches.length === 0) return;

  const bundleByProduct = new Map(
    matches
      .filter((m) => m.shopifyProductId)
      .map((m) => [m.shopifyProductId as string, m.id]),
  );

  // Aggregate per bundle so the same bundle across multiple lines is one sale row.
  const perBundle = new Map<string, { quantity: number; revenue: number }>();
  for (const li of lineItems) {
    if (!li.product_id) continue;
    const bundleId = bundleByProduct.get(`gid://shopify/Product/${li.product_id}`);
    if (!bundleId) continue;
    const quantity = li.quantity ?? 1;
    const revenue = Number(li.price ?? 0) * quantity;
    const acc = perBundle.get(bundleId) ?? { quantity: 0, revenue: 0 };
    acc.quantity += quantity;
    acc.revenue += revenue;
    perBundle.set(bundleId, acc);
  }
  if (perBundle.size === 0) return;

  const orderId = `gid://shopify/Order/${payload.id}`;
  const currencyCode = payload.currency ?? "USD";

  await saleRepo.createSales(
    [...perBundle].map(([bundleId, acc]) => ({
      shopId: shop.id,
      bundleId,
      orderId,
      quantity: acc.quantity,
      revenue: acc.revenue,
      currencyCode,
    })),
  );
}
