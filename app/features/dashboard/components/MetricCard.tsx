/**
 * A KPI tile: accent icon + quiet label + prominent value. Presentational only.
 * `tone` colors the icon to give each metric a glanceable identity.
 */
type IconName =
  | "package"
  | "check-circle"
  | "cash-dollar"
  | "view"
  | "order"
  | "cart"
  | "chart-line";

type CardTone = "neutral" | "info" | "success" | "warning" | "critical";

interface MetricCardProps {
  label: string;
  value: string;
  icon: IconName;
  tone?: CardTone;
}

export function MetricCard({ label, value, icon, tone = "neutral" }: MetricCardProps) {
  return (
    <s-box background="subdued" borderRadius="large" padding="large-100">
      <s-stack direction="block" gap="small-100">
        <s-stack direction="inline" gap="small-200" alignItems="center">
          <s-icon type={icon} tone={tone} size="small" />
          <s-text color="subdued">{label}</s-text>
        </s-stack>
        <s-heading>{value}</s-heading>
      </s-stack>
    </s-box>
  );
}
