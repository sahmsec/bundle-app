/**
 * Shop service — tenant provisioning & detail sync (use-case layer).
 * Knows nothing about HTTP or React Router; depends on the GraphqlClient
 * abstraction, not on Shopify's concrete client.
 */
import type { Shop } from "@prisma/client";
import type { GraphqlClient } from "../types/shopify";
import * as shopRepo from "../repositories/shop.server";

/** Install-time provisioning. Cheap, no API call — safe in the afterAuth hook. */
export function provisionShop(domain: string): Promise<Shop> {
  return shopRepo.ensureShop(domain);
}

/** Get the tenant, provisioning it on the fly if it somehow doesn't exist yet. */
export async function getShop(domain: string): Promise<Shop> {
  return (await shopRepo.getShopByDomain(domain)) ?? shopRepo.ensureShop(domain);
}

const SHOP_DETAILS_QUERY = `#graphql
  query ShopDetails {
    shop {
      id
      name
      currencyCode
      plan { displayName }
    }
  }`;

interface ShopDetailsResponse {
  data?: {
    shop?: {
      id: string;
      name: string;
      currencyCode: string;
      plan?: { displayName?: string | null } | null;
    };
  };
}

/**
 * Enrich the tenant with live shop details from the Admin API. Called lazily by
 * the dashboard loader (which always has an authenticated client) rather than at
 * install time, so we never depend on an admin client being available in afterAuth.
 */
export async function syncShopDetails(
  client: GraphqlClient,
  domain: string,
): Promise<Shop | null> {
  const response = await client.graphql(SHOP_DETAILS_QUERY);
  const body = (await response.json()) as ShopDetailsResponse;
  const shop = body.data?.shop;
  if (!shop) return null;

  return shopRepo.updateShopDetails(domain, {
    shopifyGid: shop.id,
    name: shop.name,
    currencyCode: shop.currencyCode,
    planName: shop.plan?.displayName ?? undefined,
  });
}
