/**
 * Dashboard service — assembles the overview read-model from the tenant + metrics.
 * Orchestrates repositories and the shop-detail sync; the route just calls this.
 */
import type { GraphqlClient } from "../types/shopify";
import type { DashboardOverview } from "../types/dashboard";
import { getShop, syncShopDetails } from "./shop.server";
import { getDashboardMetrics } from "../repositories/dashboard.server";

export async function getDashboardOverview(
  client: GraphqlClient,
  domain: string,
): Promise<DashboardOverview> {
  let shop = await getShop(domain);

  // First view after install: enrich details once. `name` is the sync sentinel.
  if (!shop.name) {
    const enriched = await syncShopDetails(client, domain);
    if (enriched) shop = enriched;
  }

  const metrics = await getDashboardMetrics(shop.id);

  return {
    shop: {
      domain: shop.domain,
      name: shop.name,
      currencyCode: shop.currencyCode,
    },
    metrics,
    hasBundles: metrics.totalBundles > 0,
  };
}
