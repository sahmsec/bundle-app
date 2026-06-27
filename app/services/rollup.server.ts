/**
 * Daily rollup — aggregates raw events + confirmed sales into BundleDailyStat,
 * the pre-aggregated table the dashboard can read cheaply at any scale. Run from
 * the cron endpoint (scheduling itself is set up in Phase 10 / deployment).
 */
import { EventType } from "@prisma/client";
import prisma from "../db.server";

interface DayTotals {
  views: number;
  addToCarts: number;
  orders: number;
  revenue: number;
}

/** Roll up a single shop for a single UTC day. Returns rows written. */
export async function rollupShopDay(shopId: string, day: Date): Promise<number> {
  const start = new Date(
    Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()),
  );
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const [events, sales] = await Promise.all([
    prisma.bundleEvent.groupBy({
      by: ["bundleId", "type"],
      where: { shopId, occurredAt: { gte: start, lt: end } },
      _count: true,
    }),
    prisma.bundleSale.groupBy({
      by: ["bundleId"],
      where: { shopId, occurredAt: { gte: start, lt: end } },
      _sum: { revenue: true },
      _count: true,
    }),
  ]);

  const byBundle = new Map<string, DayTotals>();
  const ensure = (id: string): DayTotals => {
    let totals = byBundle.get(id);
    if (!totals) {
      totals = { views: 0, addToCarts: 0, orders: 0, revenue: 0 };
      byBundle.set(id, totals);
    }
    return totals;
  };

  for (const e of events) {
    const totals = ensure(e.bundleId);
    if (e.type === EventType.VIEW) totals.views += e._count;
    else if (e.type === EventType.ADD_TO_CART) totals.addToCarts += e._count;
  }
  for (const s of sales) {
    const totals = ensure(s.bundleId);
    totals.orders += s._count;
    totals.revenue += Number(s._sum.revenue ?? 0);
  }

  let written = 0;
  for (const [bundleId, totals] of byBundle) {
    await prisma.bundleDailyStat.upsert({
      where: { bundleId_date: { bundleId, date: start } },
      create: { shopId, bundleId, date: start, ...totals },
      update: { ...totals },
    });
    written++;
  }
  return written;
}

export async function rollupAllShopsForDay(day: Date): Promise<number> {
  const shops = await prisma.shop.findMany({
    where: { uninstalledAt: null },
    select: { id: true },
  });
  let total = 0;
  for (const shop of shops) {
    total += await rollupShopDay(shop.id, day);
  }
  return total;
}
