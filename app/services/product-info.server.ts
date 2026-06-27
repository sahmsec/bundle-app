/**
 * Fetches live product display data (title/image/price) by GID from the Admin
 * API. We store only GIDs on components; this is the enrichment read so the UI
 * always reflects current Shopify data and never stale snapshots.
 */
import type { GraphqlClient } from "../types/shopify";
import type { ProductInfo } from "../types/component";

const PRODUCT_INFO_QUERY = `#graphql
  query ProductInfo($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        title
        status
        totalVariants
        featuredImage { url }
        priceRangeV2 { minVariantPrice { amount currencyCode } }
      }
    }
  }`;

interface RawProductNode {
  id: string;
  title: string;
  status?: string | null;
  totalVariants?: number | null;
  featuredImage?: { url: string } | null;
  priceRangeV2?: {
    minVariantPrice?: { amount: string; currencyCode: string } | null;
  } | null;
}

export async function fetchProductInfo(
  client: GraphqlClient,
  productIds: string[],
): Promise<Map<string, ProductInfo>> {
  const map = new Map<string, ProductInfo>();
  if (productIds.length === 0) return map;

  const response = await client.graphql(PRODUCT_INFO_QUERY, {
    variables: { ids: productIds },
  });
  const body = (await response.json()) as {
    data?: { nodes?: (RawProductNode | null)[] };
  };

  for (const node of body.data?.nodes ?? []) {
    if (!node?.id) continue;
    const min = node.priceRangeV2?.minVariantPrice;
    map.set(node.id, {
      id: node.id,
      title: node.title,
      imageUrl: node.featuredImage?.url ?? null,
      price: min?.amount ? Number(min.amount) : null,
      currencyCode: min?.currencyCode ?? null,
      status: node.status ?? null,
      totalVariants: node.totalVariants ?? null,
    });
  }

  return map;
}
