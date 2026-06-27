import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

/**
 * GDPR: customers/data_request
 *
 * Shopify forwards a customer's "give me my data" request. This app stores NO
 * customer personal data — bundles are product configuration, and analytics
 * rows are keyed by Shopify order/bundle GIDs, never by customer identity. So
 * there is nothing to assemble; we acknowledge with 200.
 *
 * `authenticate.webhook` verifies the HMAC signature first, rejecting forgeries.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} for ${shop} — no customer data stored; nothing to return.`);
  return new Response();
};
