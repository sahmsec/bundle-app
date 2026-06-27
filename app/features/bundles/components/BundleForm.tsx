import { Form } from "react-router";

import {
  BUNDLE_STATUSES,
  BUNDLE_TYPES,
  PRICING_TYPES,
} from "../../../services/bundle.schema";

/**
 * Shared create/edit form. Uncontrolled: Polaris fields are form-associated, so
 * each field's `name` serializes into FormData on submit — no React state, no
 * controlled-input wrangling. Validation errors come back from the action and
 * render via each field's native `error` prop. Selects preselect via the
 * matching option's `defaultSelected` (their `value` prop is intentionally not
 * settable).
 */
export interface BundleFormDefaults {
  title?: string;
  description?: string | null;
  type?: string;
  status?: string;
  pricingType?: string;
  pricingValue?: number | string;
}

type FieldErrors = Record<string, string[] | undefined>;

const TYPE_LABELS: Record<string, string> = {
  FIXED: "Fixed bundle (sold together)",
  CUSTOMIZABLE: "Build-a-box (buyer picks)",
};
const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  ARCHIVED: "Archived",
};
const PRICING_LABELS: Record<string, string> = {
  PERCENTAGE_DISCOUNT: "Percentage discount (% off)",
  FIXED_PRICE: "Fixed price (whole bundle)",
  FIXED_TOTAL: "Fixed amount off",
};

interface BundleFormProps {
  defaults?: BundleFormDefaults;
  errors?: FieldErrors;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function BundleForm({
  defaults = {},
  errors = {},
  isSubmitting = false,
  submitLabel = "Save",
}: BundleFormProps) {
  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <Form method="post">
      <input type="hidden" name="intent" value="save" />
      <s-stack direction="block" gap="base">
        {hasErrors && (
          <s-banner tone="critical">Please fix the highlighted fields.</s-banner>
        )}

        <s-section heading="Details">
          <s-stack direction="block" gap="base">
            <s-text-field
              name="title"
              label="Title"
              value={defaults.title ?? ""}
              error={errors.title?.[0]}
            />
            <s-text-area
              name="description"
              label="Description"
              value={defaults.description ?? ""}
              error={errors.description?.[0]}
            />
            <s-select name="type" label="Bundle type" error={errors.type?.[0]}>
              {BUNDLE_TYPES.map((value) => (
                <s-option
                  key={value}
                  value={value}
                  defaultSelected={(defaults.type ?? "FIXED") === value}
                >
                  {TYPE_LABELS[value]}
                </s-option>
              ))}
            </s-select>
            <s-select name="status" label="Status" error={errors.status?.[0]}>
              {BUNDLE_STATUSES.map((value) => (
                <s-option
                  key={value}
                  value={value}
                  defaultSelected={(defaults.status ?? "DRAFT") === value}
                >
                  {STATUS_LABELS[value]}
                </s-option>
              ))}
            </s-select>
          </s-stack>
        </s-section>

        <s-section heading="Pricing">
          <s-stack direction="block" gap="base">
            <s-select
              name="pricingType"
              label="Pricing type"
              error={errors.pricingType?.[0]}
            >
              {PRICING_TYPES.map((value) => (
                <s-option
                  key={value}
                  value={value}
                  defaultSelected={
                    (defaults.pricingType ?? "PERCENTAGE_DISCOUNT") === value
                  }
                >
                  {PRICING_LABELS[value]}
                </s-option>
              ))}
            </s-select>
            <s-number-field
              name="pricingValue"
              label="Value"
              value={String(defaults.pricingValue ?? "")}
              error={errors.pricingValue?.[0]}
            />
          </s-stack>
        </s-section>

        <s-stack direction="inline" gap="base">
          <s-button
            type="submit"
            variant="primary"
            {...(isSubmitting ? { loading: true } : {})}
          >
            {submitLabel}
          </s-button>
        </s-stack>
      </s-stack>
    </Form>
  );
}
