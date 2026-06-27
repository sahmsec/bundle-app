import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // SOFT uninstall: mark the tenant rather than deleting it. We retain bundle &
  // analytics data through the legal window; a later `shop/redact` (≈48h after
  // uninstall) does the hard delete. updateMany is a safe no-op if the Shop row
  // doesn't exist yet (tenant creation lands in Phase 4). `new Date()` is fine
  // here — this is application code, not the orchestration sandbox.
  await db.shop.updateMany({
    where: { domain: shop },
    data: { uninstalledAt: new Date() },
  });

  // Webhook requests can trigger multiple times and after an app has already been
  // uninstalled. If this already ran, the session may have been deleted previously.
  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  return new Response();
};
