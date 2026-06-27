/** Records storefront engagement events (VIEW / ADD_TO_CART) for a bundle. */
import { EventType } from "@prisma/client";
import prisma from "../db.server";
import { getShop } from "./shop.server";

const ALLOWED: EventType[] = [EventType.VIEW, EventType.ADD_TO_CART];

export async function recordStorefrontEvent(
  shopDomain: string,
  bundleId: string,
  type: EventType,
  sessionToken?: string | null,
): Promise<void> {
  if (!ALLOWED.includes(type)) return;

  const shop = await getShop(shopDomain);

  // Verify the bundle belongs to the shop before writing — never trust storefront input.
  const owned = await prisma.bundle.findFirst({
    where: { id: bundleId, shopId: shop.id },
    select: { id: true },
  });
  if (!owned) return;

  await prisma.bundleEvent.create({
    data: { shopId: shop.id, bundleId, type, sessionToken: sessionToken ?? null },
  });
}
