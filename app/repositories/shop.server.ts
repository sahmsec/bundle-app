/**
 * Shop repository — the ONLY place Prisma touches the Shop table.
 * Centralizing access here gives us one seam to add caching/replicas later and
 * keeps tenant-scoping rules in a single, auditable location.
 */
import type { Shop } from "@prisma/client";
import prisma from "../db.server";

export function getShopByDomain(domain: string): Promise<Shop | null> {
  return prisma.shop.findUnique({ where: { domain } });
}

/**
 * Idempotent provisioning, safe to call on every install/re-auth.
 * On reinstall we clear the soft-uninstall marker so the tenant is "live" again.
 */
export function ensureShop(domain: string): Promise<Shop> {
  return prisma.shop.upsert({
    where: { domain },
    create: { domain },
    update: { uninstalledAt: null },
  });
}

export interface ShopDetails {
  shopifyGid?: string;
  name?: string;
  currencyCode?: string;
  planName?: string;
}

export function updateShopDetails(domain: string, data: ShopDetails): Promise<Shop> {
  return prisma.shop.update({ where: { domain }, data });
}
