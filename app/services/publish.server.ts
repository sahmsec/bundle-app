/**
 * Publish service — makes a bundle real in Shopify.
 *
 * FIXED bundles use Shopify's RECOMMENDED native path: `productBundleCreate`
 * builds a managed bundle product and Shopify itself handles the cart transform
 * at checkout (no custom Wasm function needed). The mutation is ASYNC, so we
 * poll the operation until the product exists, then set its price to the
 * computed discounted total and record sync state in our DB.
 *
 * CUSTOMIZABLE bundles need a custom Cart Transform Function (see
 * extensions/bundle-cart-transform) — not wired here yet.
 */
import type { GraphqlClient } from "../types/shopify";
import * as bundleRepo from "../repositories/bundle.server";

type BundleWithComponents = NonNullable<
  Awaited<ReturnType<typeof bundleRepo.getBundleWithComponents>>
>;

const POLL_ATTEMPTS = 10;
const POLL_DELAY_MS = 1000;

const PRODUCT_BUNDLE_CREATE = `#graphql
  mutation ProductBundleCreate($input: ProductBundleCreateInput!) {
    productBundleCreate(input: $input) {
      productBundleOperation { id status product { id } }
      userErrors { field message }
    }
  }`;

const BUNDLE_OPERATION = `#graphql
  query BundleOperation($id: ID!) {
    productOperation(id: $id) {
      ... on ProductBundleOperation {
        status
        product { id }
        userErrors { field message }
      }
    }
  }`;

const FIRST_VARIANT = `#graphql
  query FirstVariant($id: ID!) {
    product(id: $id) { variants(first: 1) { nodes { id } } }
  }`;

const SET_VARIANT_PRICE = `#graphql
  mutation SetBundlePrice($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants { id price }
      userErrors { field message }
    }
  }`;

const COMPONENT_PRICES = `#graphql
  query ComponentPrices($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product { id priceRangeV2 { minVariantPrice { amount } } }
    }
  }`;

const COMPONENT_OPTIONS = `#graphql
  query ComponentOptions($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        title
        options { id name optionValues { name } }
      }
    }
  }`;

interface UserError {
  field?: string[] | null;
  message: string;
}

interface RawProductOptions {
  id: string;
  title: string;
  options: { id: string; name: string; optionValues: { name: string }[] }[];
}

interface ComponentInput {
  productId: string;
  quantity: number;
  optionSelections: { componentOptionId: string; name: string; values: string[] }[];
}

/**
 * Build the components input for productBundleCreate. Each component must declare
 * `optionSelections` mapping every option on the component product (even the
 * default "Title" option of single-variant products) onto the bundle parent.
 * Parent option names must be unique, so we de-dupe them.
 */
async function buildComponentsInput(
  client: GraphqlClient,
  bundle: BundleWithComponents,
): Promise<ComponentInput[]> {
  const ids = [...new Set(bundle.components.map((c) => c.productId))];
  const response = await client.graphql(COMPONENT_OPTIONS, { variables: { ids } });
  const body = (await response.json()) as {
    data?: { nodes?: (RawProductOptions | null)[] };
  };

  const byId = new Map<string, RawProductOptions>();
  for (const node of body.data?.nodes ?? []) {
    if (node?.id) byId.set(node.id, node);
  }

  const usedNames = new Set<string>();
  return bundle.components.map((c) => {
    const product = byId.get(c.productId);
    const options = product?.options ?? [];

    const optionSelections = options.map((opt) => {
      const base =
        options.length === 1
          ? (product?.title ?? "Item")
          : `${product?.title ?? "Item"} · ${opt.name}`;
      let name = base;
      let n = 1;
      while (usedNames.has(name)) {
        n += 1;
        name = `${base} ${n}`;
      }
      usedNames.add(name);
      return {
        componentOptionId: opt.id,
        name,
        // Include all the option's values (the whole product).
        values: opt.optionValues.map((v) => v.name),
      };
    });

    return { productId: c.productId, quantity: c.quantity, optionSelections };
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function firstErrors(errors: UserError[] | undefined | null): string | null {
  return errors && errors.length ? errors.map((e) => e.message).join("; ") : null;
}

async function computeBundlePrice(
  client: GraphqlClient,
  bundle: BundleWithComponents,
): Promise<number | null> {
  const ids = [...new Set(bundle.components.map((c) => c.productId))];
  if (ids.length === 0) return null;

  const response = await client.graphql(COMPONENT_PRICES, { variables: { ids } });
  const body = (await response.json()) as {
    data?: {
      nodes?: ({ id: string; priceRangeV2?: { minVariantPrice?: { amount: string } } } | null)[];
    };
  };

  const prices = new Map<string, number>();
  for (const node of body.data?.nodes ?? []) {
    if (node?.id) prices.set(node.id, Number(node.priceRangeV2?.minVariantPrice?.amount ?? 0));
  }

  const sum = bundle.components.reduce(
    (total, c) => total + (prices.get(c.productId) ?? 0) * c.quantity,
    0,
  );
  const value = Number(bundle.pricingValue);

  switch (bundle.pricingType) {
    case "PERCENTAGE_DISCOUNT":
      return Math.max(0, sum * (1 - value / 100));
    case "FIXED_PRICE":
      return Math.max(0, value);
    case "FIXED_TOTAL":
      return Math.max(0, sum - value);
    default:
      return null;
  }
}

async function getFirstVariantId(
  client: GraphqlClient,
  productId: string,
): Promise<string | null> {
  const response = await client.graphql(FIRST_VARIANT, { variables: { id: productId } });
  const body = (await response.json()) as {
    data?: { product?: { variants?: { nodes?: { id: string }[] } } };
  };
  return body.data?.product?.variants?.nodes?.[0]?.id ?? null;
}

export interface PublishResult {
  ok: boolean;
  error?: string;
}

export async function publishBundle(
  client: GraphqlClient,
  shopId: string,
  bundleId: string,
): Promise<PublishResult> {
  const bundle = await bundleRepo.getBundleWithComponents(shopId, bundleId);
  if (!bundle) return { ok: false, error: "Bundle not found." };
  if (bundle.type !== "FIXED") {
    return {
      ok: false,
      error:
        "Only fixed bundles can be published yet. Customized bundles need the Cart Transform Function (see Phase 8 notes).",
    };
  }
  if (bundle.components.length === 0) {
    return { ok: false, error: "Add at least one product before publishing." };
  }

  await bundleRepo.setSyncState(shopId, bundleId, "SYNCING", null);

  try {
    // 1. Create the managed bundle product (async). Each component must carry
    //    optionSelections, so fetch component product options and map them.
    const components = await buildComponentsInput(client, bundle);
    const createRes = await client.graphql(PRODUCT_BUNDLE_CREATE, {
      variables: {
        input: {
          title: bundle.title,
          components,
        },
      },
    });
    const createBody = (await createRes.json()) as {
      data?: {
        productBundleCreate?: {
          productBundleOperation?: { id: string; product?: { id: string } | null } | null;
          userErrors?: UserError[];
        };
      };
    };

    const createErr = firstErrors(createBody.data?.productBundleCreate?.userErrors);
    if (createErr) throw new Error(createErr);

    const operation = createBody.data?.productBundleCreate?.productBundleOperation;
    const operationId = operation?.id ?? null;
    let productId = operation?.product?.id ?? null;

    // 2. Poll the operation until the product is ready.
    for (let attempt = 0; !productId && operationId && attempt < POLL_ATTEMPTS; attempt++) {
      await delay(POLL_DELAY_MS);
      const pollRes = await client.graphql(BUNDLE_OPERATION, {
        variables: { id: operationId },
      });
      const pollBody = (await pollRes.json()) as {
        data?: {
          productOperation?: {
            status?: string;
            product?: { id: string } | null;
            userErrors?: UserError[];
          };
        };
      };
      const op = pollBody.data?.productOperation;
      const opErr = firstErrors(op?.userErrors);
      if (opErr) throw new Error(opErr);
      productId = op?.product?.id ?? null;
    }

    if (!productId) throw new Error("Bundle product creation timed out. Try again.");

    // 3. Set the bundle product's price to the discounted total.
    const price = await computeBundlePrice(client, bundle);
    if (price != null) {
      const variantId = await getFirstVariantId(client, productId);
      if (variantId) {
        const priceRes = await client.graphql(SET_VARIANT_PRICE, {
          variables: {
            productId,
            variants: [{ id: variantId, price: price.toFixed(2) }],
          },
        });
        const priceBody = (await priceRes.json()) as {
          data?: { productVariantsBulkUpdate?: { userErrors?: UserError[] } };
        };
        const priceErr = firstErrors(priceBody.data?.productVariantsBulkUpdate?.userErrors);
        if (priceErr) throw new Error(priceErr);
      }
    }

    // 4. Record success.
    await bundleRepo.setPublished(shopId, bundleId, productId);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publish failed.";
    await bundleRepo.setSyncState(shopId, bundleId, "FAILED", message);
    return { ok: false, error: message };
  }
}
