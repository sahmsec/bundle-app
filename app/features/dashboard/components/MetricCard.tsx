/**
 * Presentational metric tile. No business logic — takes a pre-formatted label
 * and value so it's reusable for any KPI and easy to snapshot-test.
 */
interface MetricCardProps {
  label: string;
  value: string;
}

export function MetricCard({ label, value }: MetricCardProps) {
  return (
    <s-box
      padding="base"
      borderWidth="base"
      borderRadius="base"
      background="subdued"
    >
      <s-stack direction="block" gap="base">
        <s-text>{label}</s-text>
        <s-heading>{value}</s-heading>
      </s-stack>
    </s-box>
  );
}
