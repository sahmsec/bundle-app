/**
 * Dashboard read-model repository.
 *
 * Reads pre-aggregated counts/sums — never raw event rows. At scale the daily
 * rollup (Phase 9) will back the time-series; these top-line metrics stay cheap
 * because they're COUNT/SUM with indexed WHERE clauses, run in one round trip.
 */
import { BundleStatus, EventType } from "@prisma/client";
import prisma from "../db.server";
import type { DashboardMetrics } from "../types/dashboard";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function getDashboardMetrics(shopId: string): Promise<DashboardMetrics> {
  const since = new Date(Date.now() - THIRTY_DAYS_MS);

  const [totalBundles, activeBundles, revenue, views30d] = await prisma.$transaction([
    prisma.bundle.count({ where: { shopId, deletedAt: null } }),
    prisma.bundle.count({
      where: { shopId, deletedAt: null, status: BundleStatus.ACTIVE },
    }),
    prisma.bundleSale.aggregate({ where: { shopId }, _sum: { revenue: true } }),
    prisma.bundleEvent.count({
      where: { shopId, type: EventType.VIEW, occurredAt: { gte: since } },
    }),
  ]);

  return {
    totalBundles,
    activeBundles,
    // Decimal -> number is fine for display; we never do money math on this value.
    totalRevenue: revenue._sum.revenue ? Number(revenue._sum.revenue) : 0,
    views30d,
  };
}
