/** Assembles the analytics overview read-model for the dashboard. */
import * as analyticsRepo from "../repositories/analytics.server";
import type { AnalyticsOverview } from "../types/analytics";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getAnalyticsOverview(
  shopId: string,
  currencyCode: string | null,
  days = 30,
): Promise<AnalyticsOverview> {
  // Window start at UTC midnight `days-1` days ago, so the series spans `days` buckets.
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const since = new Date(todayUtc - (days - 1) * DAY_MS);

  const [totals, series, topBundles] = await Promise.all([
    analyticsRepo.getTotals(shopId, since),
    analyticsRepo.getDailySeries(shopId, since, days),
    analyticsRepo.getTopBundles(shopId, since),
  ]);

  return {
    days,
    currencyCode,
    totalRevenue: totals.revenue,
    totalOrders: totals.orders,
    totalUnits: totals.units,
    series,
    topBundles,
  };
}
