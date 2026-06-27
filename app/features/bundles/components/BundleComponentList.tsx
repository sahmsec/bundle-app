import { useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";

import type { ComponentView } from "../../../types/component";
import { formatMoney } from "../../../utils/format";

/**
 * The products inside a bundle. "Add products" opens the App Bridge Resource
 * Picker (client-side); we send only the selected GIDs to the action. Quantity
 * edits and removals use independent fetchers so each row updates without a full
 * navigation, and the loader revalidates automatically afterward.
 */
export function BundleComponentList({
  components,
}: {
  components: ComponentView[];
}) {
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const addProducts = async () => {
    const selected = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      action: "add",
      // Pre-select what's already in the bundle so the picker reflects state.
      selectionIds: components.map((c) => ({ id: c.productId })),
    });
    if (!selected || selected.length === 0) return;

    fetcher.submit(
      {
        intent: "add-components",
        productIds: JSON.stringify(selected.map((p) => p.id)),
      },
      { method: "post" },
    );
  };

  return (
    <s-section heading="Products in this bundle">
      <s-stack direction="block" gap="base">
        <s-stack direction="inline" gap="base">
          <s-button onClick={addProducts}>Add products</s-button>
        </s-stack>

        {components.length === 0 ? (
          <s-paragraph>
            No products yet. Add products to define what&apos;s in this bundle.
          </s-paragraph>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header>Product</s-table-header>
              <s-table-header>Price</s-table-header>
              <s-table-header>Quantity</s-table-header>
              <s-table-header>Actions</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {components.map((c) => (
                <s-table-row key={c.id}>
                  <s-table-cell>
                    <s-stack direction="inline" gap="small">
                      {c.product?.imageUrl && (
                        <s-thumbnail
                          size="small"
                          src={c.product.imageUrl}
                          alt={c.product.title}
                        />
                      )}
                      <s-text>{c.product?.title ?? "Product unavailable"}</s-text>
                    </s-stack>
                  </s-table-cell>
                  <s-table-cell>
                    {c.product?.price != null
                      ? formatMoney(c.product.price, c.product.currencyCode)
                      : "—"}
                  </s-table-cell>
                  <s-table-cell>
                    <fetcher.Form method="post">
                      <input type="hidden" name="intent" value="update-component" />
                      <input type="hidden" name="componentId" value={c.id} />
                      <s-stack direction="inline" gap="small">
                        <s-number-field
                          name="quantity"
                          label="Qty"
                          value={String(c.quantity)}
                        />
                        <s-button type="submit" variant="tertiary">
                          Save
                        </s-button>
                      </s-stack>
                    </fetcher.Form>
                  </s-table-cell>
                  <s-table-cell>
                    <fetcher.Form method="post">
                      <input type="hidden" name="intent" value="remove-component" />
                      <input type="hidden" name="componentId" value={c.id} />
                      <s-button type="submit" variant="tertiary">
                        Remove
                      </s-button>
                    </fetcher.Form>
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
      </s-stack>
    </s-section>
  );
}
