import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * GDPR: shop/redact
 *
 * Fires ~48h after a merchant uninstalls. This is the HARD delete: erase the
 * tenant entirely. Deleting the Shop row cascades (onDelete: Cascade in the
 * schema) to every bundle, component, event, sale, stat and audit row, so one
 * delete wipes the tenant. We also clear any lingering sessions.
 *
 * deleteMany is idempotent — a redelivered webhook simply deletes nothing.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} for ${shop} — hard-deleting all tenant data.`);

  await db.shop.deleteMany({ where: { domain: shop } });
  await db.session.deleteMany({ where: { shop } });

  return new Response();
};
