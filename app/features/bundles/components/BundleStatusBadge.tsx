/** Maps a bundle status to a Polaris badge tone. Presentational only. */
type Tone = "info" | "success" | "neutral";

const STATUS_TONE: Record<string, Tone> = {
  DRAFT: "info",
  ACTIVE: "success",
  ARCHIVED: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  ARCHIVED: "Archived",
};

export function BundleStatusBadge({ status }: { status: string }) {
  return (
    <s-badge tone={STATUS_TONE[status] ?? "neutral"}>
      {STATUS_LABEL[status] ?? status}
    </s-badge>
  );
}
