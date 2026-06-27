/** Read-model shapes for the dashboard. Plain, serializable data the loader returns. */

export interface DashboardMetrics {
  totalBundles: number;
  activeBundles: number;
  /** All-time confirmed revenue, in the shop's presentment currency. */
  totalRevenue: number;
  /** Storefront bundle views in the trailing 30 days. */
  views30d: number;
}

export interface DashboardOverview {
  shop: {
    domain: string;
    name: string | null;
    currencyCode: string | null;
  };
  metrics: DashboardMetrics;
  /** Drives the empty-state vs. populated-dashboard branch in the UI. */
  hasBundles: boolean;
}
