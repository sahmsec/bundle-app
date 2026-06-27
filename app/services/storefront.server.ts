/**
 * Storefront read service — powers the app-proxy JSON the theme widget consumes.
 * Loads active bundles containing a product, then enriches with live product
 * data (title/image/price + default variant id for add-to-cart).
 */
import type { GraphqlClient } from "../types/shopify";
import * as bundleRepo from "../repositories/bundle.server";

export interface StorefrontComponent {
  productId: string;
  /** Numeric variant id for /cart/add.js (null if it couldn't be resolved). */
  variantId: string | null;
  quantity: number;
  title: string;
  imageUrl: string | null;
  price: number | null;
  currencyCode: string | null;
}

export interface StorefrontBundle {
  id: string;
  title: string;
  handle: string;
  savingsLabel: string | null;
  components: StorefrontComponent[];
}

const PRODUCTS_QUERY = `#graphql
  query StorefrontProducts($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        title
        featuredImage { url }
        priceRangeV2 { minVariantPrice { amount currencyCode } }
        variants(first: 1) { nodes { id } }
      }
    }
  }`;

interface RawNode {
  id: string;
  title: string;
  featuredImage?: { url: string } | null;
  priceRangeV2?: {
    minVariantPrice?: { amount: string; currencyCode: string } | null;
  } | null;
  variants?: { nodes: { id: string }[] } | null;
}

interface ProductData {
  title: string;
  imageUrl: string | null;
  price: number | null;
  currencyCode: string | null;
  defaultVariantId: string | null;
}

/** Extract the numeric id from a GID, e.g. gid://shopify/ProductVariant/42 -> "42". */
function numericId(gid: string | null | undefined): string | null {
  if (!gid) return null;
  const tail = gid.split("/").pop();
  return tail && /^\d+$/.test(tail) ? tail : null;
}

async function fetchProductData(
  client: GraphqlClient,
  ids: string[],
): Promise<Map<string, ProductData>> {
  const map = new Map<string, ProductData>();
  if (ids.length === 0) return map;

  const response = await client.graphql(PRODUCTS_QUERY, { variables: { ids } });
  const body = (await response.json()) as { data?: { nodes?: (RawNode | null)[] } };

  for (const node of body.data?.nodes ?? []) {
    if (!node?.id) continue;
    const min = node.priceRangeV2?.minVariantPrice;
    map.set(node.id, {
      title: node.title,
      imageUrl: node.featuredImage?.url ?? null,
      price: min?.amount ? Number(min.amount) : null,
      currencyCode: min?.currencyCode ?? null,
      defaultVariantId: numericId(node.variants?.nodes?.[0]?.id),
    });
  }
  return map;
}

function computeSavings(
  pricingType: string,
  pricingValue: number,
  componentSum: number,
): string | null {
  if (pricingType === "PERCENTAGE_DISCOUNT") {
    return pricingValue > 0 ? `Save ${pricingValue}%` : null;
  }
  if (pricingType === "FIXED_PRICE") {
    const saved = componentSum - pricingValue;
    return saved > 0 ? `Save ${saved.toFixed(2)}` : null;
  }
  if (pricingType === "FIXED_TOTAL") {
    return pricingValue > 0 ? `Save ${pricingValue.toFixed(2)}` : null;
  }
  return null;
}

export async function getStorefrontBundlesForProduct(
  client: GraphqlClient,
  shopId: string,
  productGid: string,
): Promise<StorefrontBundle[]> {
  const bundles = await bundleRepo.findActiveBundlesForProduct(shopId, productGid);
  if (bundles.length === 0) return [];

  const productIds = [
    ...new Set(bundles.flatMap((b) => b.components.map((c) => c.productId))),
  ];
  const info = await fetchProductData(client, productIds);

  return bundles.map((b) => {
    const components: StorefrontComponent[] = b.components.map((c) => {
      const p = info.get(c.productId);
      return {
        productId: c.productId,
        variantId: c.variantId ? numericId(c.variantId) : (p?.defaultVariantId ?? null),
        quantity: c.quantity,
        title: p?.title ?? "Product",
        imageUrl: p?.imageUrl ?? null,
        price: p?.price ?? null,
        currencyCode: p?.currencyCode ?? null,
      };
    });

    const componentSum = components.reduce(
      (sum, c) => sum + (c.price ?? 0) * c.quantity,
      0,
    );

    return {
      id: b.id,
      title: b.title,
      handle: b.handle,
      savingsLabel: computeSavings(b.pricingType, Number(b.pricingValue), componentSum),
      components,
    };
  });
}
