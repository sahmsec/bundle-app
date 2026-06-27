/**
 * Component service — manages the products inside a bundle.
 * Every operation verifies the bundle belongs to the shop FIRST (tenant safety),
 * then operates by bundleId.
 */
import type { GraphqlClient } from "../types/shopify";
import type { ComponentView } from "../types/component";
import * as bundleRepo from "../repositories/bundle.server";
import * as componentRepo from "../repositories/component.server";
import { fetchProductInfo } from "./product-info.server";

const MAX_QUANTITY = 999;

async function assertBundleOwned(shopId: string, bundleId: string): Promise<void> {
  const bundle = await bundleRepo.getBundleById(shopId, bundleId);
  if (!bundle) {
    throw new Response("Bundle not found", { status: 404 });
  }
}

/** Attach products as components, skipping any already present. Returns count added. */
export async function addProductsToBundle(
  shopId: string,
  bundleId: string,
  productIds: string[],
): Promise<number> {
  await assertBundleOwned(shopId, bundleId);

  const existing = await componentRepo.existingProductIds(bundleId);
  const fresh = productIds.filter((id) => id && !existing.has(id));
  if (fresh.length === 0) return 0;

  let position = (await componentRepo.maxPosition(bundleId)) + 1;
  const data = fresh.map((productId) => ({ bundleId, productId, position: position++ }));

  const result = await componentRepo.createMany(data);
  return result.count;
}

export async function updateComponentQuantity(
  shopId: string,
  bundleId: string,
  componentId: string,
  quantity: number,
): Promise<boolean> {
  await assertBundleOwned(shopId, bundleId);
  const qty = Math.max(1, Math.min(MAX_QUANTITY, Math.floor(quantity) || 1));
  const result = await componentRepo.updateQuantity(bundleId, componentId, qty);
  return result.count > 0;
}

export async function removeComponent(
  shopId: string,
  bundleId: string,
  componentId: string,
): Promise<boolean> {
  await assertBundleOwned(shopId, bundleId);
  const result = await componentRepo.remove(bundleId, componentId);
  return result.count > 0;
}

/** List components enriched with live product data for display. */
export async function getBundleComponents(
  client: GraphqlClient,
  shopId: string,
  bundleId: string,
): Promise<ComponentView[]> {
  await assertBundleOwned(shopId, bundleId);

  const components = await componentRepo.listByBundle(bundleId);
  const productIds = [...new Set(components.map((c) => c.productId))];
  const info = await fetchProductInfo(client, productIds);

  return components.map((c) => ({
    id: c.id,
    productId: c.productId,
    variantId: c.variantId,
    quantity: c.quantity,
    position: c.position,
    optional: c.optional,
    product: info.get(c.productId) ?? null,
  }));
}
