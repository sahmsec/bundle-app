import type { ReactNode } from "react";

/**
 * Centered empty state: accent icon, confident headline, supportive copy, and
 * a single clear action. Shared across the app so every "nothing here yet"
 * moment feels intentional rather than blank.
 */
type IconName =
  | "package"
  | "search"
  | "chart-line"
  | "cart"
  | "product";

interface EmptyStateProps {
  icon: IconName;
  heading: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, heading, description, action }: EmptyStateProps) {
  return (
    <s-box padding="large-500">
      <s-stack direction="block" gap="base" alignItems="center" justifyContent="center">
        <s-box background="subdued" borderRadius="large" padding="base">
          <s-icon type={icon} tone="info" size="base" />
        </s-box>
        <s-heading>{heading}</s-heading>
        {description ? (
          <s-box maxInlineSize="420px">
            <s-text color="subdued">{description}</s-text>
          </s-box>
        ) : null}
        {action ? <s-stack direction="inline" gap="base">{action}</s-stack> : null}
      </s-stack>
    </s-box>
  );
}
