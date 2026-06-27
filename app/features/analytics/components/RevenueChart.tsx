/**
 * Minimal dependency-free SVG bar chart of daily revenue. Pure/presentational —
 * no charting library to keep the bundle small and the render predictable.
 */
import type { AnalyticsPoint } from "../../../types/analytics";

export function RevenueChart({ series }: { series: AnalyticsPoint[] }) {
  const width = 100;
  const height = 32;
  const max = Math.max(1, ...series.map((p) => p.revenue));
  const n = Math.max(1, series.length);
  const slot = width / n;
  const barWidth = slot * 0.7;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Daily revenue"
      style={{ width: "100%", height: "120px", display: "block" }}
    >
      {series.map((point, i) => {
        const barHeight = (point.revenue / max) * height;
        return (
          <rect
            key={point.date}
            x={i * slot + (slot - barWidth) / 2}
            y={height - barHeight}
            width={barWidth}
            height={barHeight}
            fill="#1f6b3b"
          >
            <title>{`${point.date}: ${point.revenue.toFixed(2)}`}</title>
          </rect>
        );
      })}
    </svg>
  );
}
