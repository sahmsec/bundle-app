/**
 * Analytics read model. Reads live from BundleSale so the dashboard works
 * before the daily rollup runs; BundleDailyStat (Phase 9 rollup) is the scale
 * path for long ranges.
 */
import prisma from "../db.server";
import type { AnalyticsPoint, TopBundle } from "../types/analytics";

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getTotals(
  shopId: string,
  since: Date,
): Promise<{ revenue: number; orders: number; units: number }> {
  const agg = await prisma.bundleSale.aggregate({
    where: { shopId, occurredAt: { gte: since } },
    _sum: { revenue: true, quantity: true },
    _count: true,
  });
  return {
    revenue: Number(agg._sum.revenue ?? 0),
    units: agg._sum.quantity ?? 0,
    orders: agg._count,
  };
}

/** Daily revenue/orders series, zero-filled across the window for a clean chart. */
export async function getDailySeries(
  shopId: string,
  since: Date,
  days: number,
): Promise<AnalyticsPoint[]> {
  const sales = await prisma.bundleSale.findMany({
    where: { shopId, occurredAt: { gte: since } },
    select: { occurredAt: true, revenue: true },
  });

  const buckets = new Map<string, { revenue: number; orders: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
    buckets.set(dayKey(d), { revenue: 0, orders: 0 });
  }
  for (const sale of sales) {
    const bucket = buckets.get(dayKey(sale.occurredAt));
    if (bucket) {
      bucket.revenue += Number(sale.revenue);
      bucket.orders += 1;
    }
  }

  return [...buckets.entries()].map(([date, v]) => ({
    date,
    revenue: v.revenue,
    orders: v.orders,
  }));
}

export async function getTopBundles(
  shopId: string,
  since: Date,
  limit = 5,
): Promise<TopBundle[]> {
  const grouped = await prisma.bundleSale.groupBy({
    by: ["bundleId"],
    where: { shopId, occurredAt: { gte: since } },
    _sum: { revenue: true, quantity: true },
    _count: true,
    orderBy: { _sum: { revenue: "desc" } },
    take: limit,
  });

  const ids = grouped.map((g) => g.bundleId);
  const bundles = await prisma.bundle.findMany({
    where: { id: { in: ids } },
    select: { id: true, title: true },
  });
  const titles = new Map(bundles.map((b) => [b.id, b.title]));

  return grouped.map((g) => ({
    bundleId: g.bundleId,
    title: titles.get(g.bundleId) ?? "Bundle",
    revenue: Number(g._sum.revenue ?? 0),
    units: g._sum.quantity ?? 0,
    orders: g._count,
  }));
}
