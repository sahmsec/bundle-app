import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { redirect, useActionData, useNavigation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { getShop } from "../services/shop.server";
import { createBundle } from "../services/bundle.server";
import { bundleInputSchema, toFieldErrors } from "../services/bundle.schema";
import {
  BundleForm,
  type BundleFormDefaults,
} from "../features/bundles/components/BundleForm";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getShop(session.shop);

  const formData = await request.formData();
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = bundleInputSchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: toFieldErrors(parsed.error), values: raw };
  }

  const bundle = await createBundle(shop.id, parsed.data);
  // Land on the edit page — Phase 6 adds product selection right here.
  return redirect(`/app/bundles/${bundle.id}`);
};

export default function NewBundle() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <s-page heading="Create bundle">
      <BundleForm
        defaults={(actionData?.values ?? {}) as BundleFormDefaults}
        errors={actionData?.errors}
        isSubmitting={isSubmitting}
        submitLabel="Create bundle"
      />
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
