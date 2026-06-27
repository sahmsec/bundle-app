/**
 * App Proxy endpoint — storefront-facing, reached via /apps/bundle-data on the
 * shop's domain. `authenticate.public.appProxy` verifies the signed request.
 * Returns JSON of active bundles for a product, enriched with live product data.
 * This is a resource route (no UI), so it exports only a loader.
 */
import type { LoaderFunctionArgs } from "react-router";

import { authenticate } from "../shopify.server";
import { getShop } from "../services/shop.server";
import { getStorefrontBundlesForProduct } from "../services/storefront.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.public.appProxy(request);

  // No verified shop session -> respond empty (widget hides itself).
  if (!session || !admin) {
    return Response.json({ bundles: [] }, { status: 200 });
  }

  const productId = new URL(request.url).searchParams.get("product_id");
  if (!productId) {
    return Response.json({ bundles: [] });
  }

  const shop = await getShop(session.shop);
  const productGid = `gid://shopify/Product/${productId}`;

  const bundles = await getStorefrontBundlesForProduct(
    { graphql: (query, options) => admin.graphql(query, options) },
    shop.id,
    productGid,
  );

  return Response.json(
    { bundles },
    // Cache at the edge to keep storefront load low; Phase 8 moves the hot path
    // to CDN-served metafields entirely.
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
};
