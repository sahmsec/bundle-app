// Cart Transform Function — expand a bundle variant into its components at
// checkout. Runs in Shopify's Wasm sandbox: no network, no DB — only the input
// query result (which includes the projected metafields). Keep it pure and cheap.
//
// `run` is the export referenced by shopify.extension.toml targeting.
export function run(input) {
  const operations = [];

  for (const line of input.cart.lines) {
    const variant = line.merchandise;
    if (variant.__typename !== "ProductVariant") continue;

    const references = variant.componentReferences?.jsonValue;
    if (!Array.isArray(references) || references.length === 0) continue;

    const quantities = Array.isArray(variant.componentQuantities?.jsonValue)
      ? variant.componentQuantities.jsonValue
      : [];

    const expandedCartItems = references.map((merchandiseId, index) => ({
      merchandiseId,
      // Scale per-component quantity by how many bundles are in the cart line.
      quantity: (Number(quantities[index]) || 1) * line.quantity,
    }));

    operations.push({
      expand: {
        cartLineId: line.id,
        expandedCartItems,
      },
    });
  }

  return { operations };
}
