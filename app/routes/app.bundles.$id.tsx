import { useEffect, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import { getShop } from "../services/shop.server";
import { deleteBundle, getBundle, updateBundle } from "../services/bundle.server";
import {
  addProductsToBundle,
  getBundleComponents,
  removeComponent,
  updateComponentQuantity,
} from "../services/component.server";
import { bundleInputSchema, toFieldErrors } from "../services/bundle.schema";
import { publishBundle } from "../services/publish.server";
import { toBundleDetail } from "../utils/bundle-dto";
import {
  BundleForm,
  type BundleFormDefaults,
} from "../features/bundles/components/BundleForm";
import { BundleComponentList } from "../features/bundles/components/BundleComponentList";

const SYNC_TONE: Record<string, "success" | "critical" | "info" | "neutral"> = {
  SYNCED: "success",
  FAILED: "critical",
  SYNCING: "info",
  PENDING: "neutral",
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = await getShop(session.shop);

  const bundle = await getBundle(shop.id, params.id!);
  if (!bundle) {
    throw new Response("Bundle not found", { status: 404 });
  }

  const components = await getBundleComponents(
    { graphql: (query, options) => admin.graphql(query, options) },
    shop.id,
    bundle.id,
  );

  return { bundle: toBundleDetail(bundle), components };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = await getShop(session.shop);
  const bundleId = params.id!;

  const formData = await request.formData();
  const intent = formData.get("intent");

  switch (intent) {
    case "delete":
      await deleteBundle(shop.id, bundleId);
      return redirect("/app/bundles");

    case "publish": {
      const result = await publishBundle(
        { graphql: (query, options) => admin.graphql(query, options) },
        shop.id,
        bundleId,
      );
      return result.ok
        ? { ok: true as const }
        : { publishError: result.error ?? "Publish failed." };
    }

    case "add-components": {
      const productIds = JSON.parse(
        String(formData.get("productIds") ?? "[]"),
      ) as string[];
      await addProductsToBundle(shop.id, bundleId, productIds);
      return { ok: true as const };
    }

    case "update-component":
      await updateComponentQuantity(
        shop.id,
        bundleId,
        String(formData.get("componentId")),
        Number(formData.get("quantity")),
      );
      return { ok: true as const };

    case "remove-component":
      await removeComponent(shop.id, bundleId, String(formData.get("componentId")));
      return { ok: true as const };

    default: {
      // "save" — update the bundle's own fields.
      const raw = Object.fromEntries(formData) as Record<string, string>;
      const parsed = bundleInputSchema.safeParse(raw);
      if (!parsed.success) {
        return { errors: toFieldErrors(parsed.error), values: raw };
      }
      await updateBundle(shop.id, bundleId, parsed.data);
      return { ok: true as const };
    }
  }
};

export default function EditBundle() {
  const { bundle, components } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const shopify = useAppBridge();

  const isSubmitting = navigation.state === "submitting";
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (actionData && "ok" in actionData && actionData.ok) {
      shopify.toast.show("Bundle saved");
    }
  }, [actionData, shopify]);

  const errors =
    actionData && "errors" in actionData ? actionData.errors : undefined;
  const publishError =
    actionData && "publishError" in actionData ? actionData.publishError : undefined;

  const defaults: BundleFormDefaults =
    actionData && "values" in actionData
      ? (actionData.values as BundleFormDefaults)
      : {
          title: bundle.title,
          description: bundle.description,
          type: bundle.type,
          status: bundle.status,
          pricingType: bundle.pricingType,
          pricingValue: bundle.pricingValue,
        };

  return (
    <s-page heading={bundle.title}>
      <BundleForm
        defaults={defaults}
        errors={errors}
        isSubmitting={isSubmitting}
        submitLabel="Save"
      />

      <s-section heading="Publish">
        <s-stack direction="block" gap="base">
          {publishError && <s-banner tone="critical">{publishError}</s-banner>}
          <s-stack direction="inline" gap="base">
            <s-text>Status:</s-text>
            <s-badge tone={SYNC_TONE[bundle.syncStatus] ?? "neutral"}>
              {bundle.syncStatus}
            </s-badge>
          </s-stack>
          <s-paragraph>
            Publishing creates a managed bundle product in Shopify and applies the
            discount at checkout. Fixed bundles only for now.
          </s-paragraph>
          <Form method="post">
            <input type="hidden" name="intent" value="publish" />
            <s-button
              type="submit"
              variant="primary"
              {...(isSubmitting ? { loading: true } : {})}
            >
              {bundle.shopifyProductId ? "Re-publish bundle" : "Publish bundle"}
            </s-button>
          </Form>
        </s-stack>
      </s-section>

      <BundleComponentList components={components} />

      <s-section heading="Danger zone">
        {!confirming ? (
          <s-button onClick={() => setConfirming(true)}>Delete bundle</s-button>
        ) : (
          <Form method="post">
            <input type="hidden" name="intent" value="delete" />
            <s-stack direction="block" gap="base">
              <s-text>
                This archives the bundle and removes it from the storefront.
                Analytics history is kept.
              </s-text>
              <s-stack direction="inline" gap="base">
                <s-button
                  type="submit"
                  variant="primary"
                  {...(isSubmitting ? { loading: true } : {})}
                >
                  Confirm delete
                </s-button>
                <s-button onClick={() => setConfirming(false)}>Cancel</s-button>
              </s-stack>
            </s-stack>
          </Form>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
