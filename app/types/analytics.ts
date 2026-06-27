export interface AnalyticsPoint {
  date: string; // YYYY-MM-DD
  revenue: number;
  orders: number;
}

export interface TopBundle {
  bundleId: string;
  title: string;
  revenue: number;
  units: number;
  orders: number;
}

export interface AnalyticsOverview {
  days: number;
  currencyCode: string | null;
  totalRevenue: number;
  totalOrders: number;
  totalUnits: number;
  series: AnalyticsPoint[];
  topBundles: TopBundle[];
}
