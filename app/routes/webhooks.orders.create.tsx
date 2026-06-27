import type { ActionFunctionArgs } from "react-router";

import { authenticate } from "../shopify.server";
import { recordWebhookOnce } from "../services/webhook.server";
import {
  recordBundleSalesFromOrder,
  type OrderWebhookPayload,
} from "../services/sales.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  // Capture the event id before authenticate consumes the body.
  const eventId = request.headers.get("X-Shopify-Webhook-Id");
  const { shop, topic, payload } = await authenticate.webhook(request);

  // Idempotency: short-circuit a redelivered webhook.
  if (eventId && !(await recordWebhookOnce(eventId, topic, shop))) {
    return new Response();
  }

  await recordBundleSalesFromOrder(shop, payload as OrderWebhookPayload);
  return new Response();
};
