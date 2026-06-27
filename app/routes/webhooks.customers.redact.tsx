import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

/**
 * GDPR: customers/redact
 *
 * "Delete this customer's data." We store none (see customers/data_request), so
 * there is nothing to erase. Acknowledge with 200. If a future phase ever begins
 * storing customer-linked data, this handler MUST delete it here.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} for ${shop} — no customer data stored; nothing to redact.`);
  return new Response();
};
