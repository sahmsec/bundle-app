/**
 * Secret-protected maintenance endpoint. A scheduler (set up in Phase 10) POSTs
 * here daily with `Authorization: Bearer $CRON_SECRET` to: (1) roll yesterday's
 * events+sales into BundleDailyStat, (2) prune the webhook idempotency ledger.
 * Not admin-authenticated — guarded solely by the shared secret.
 */
import type { ActionFunctionArgs } from "react-router";

import { rollupAllShopsForDay } from "../services/rollup.server";
import { pruneProcessedWebhooks } from "../services/webhook.server";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("Authorization") === `Bearer ${secret}`;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rolled = await rollupAllShopsForDay(yesterday);
  const pruned = await pruneProcessedWebhooks();

  return Response.json({ rolled, pruned });
};
