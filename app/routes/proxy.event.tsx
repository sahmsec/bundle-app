/**
 * Storefront event ingestion via app proxy: /apps/bundle-data/event.
 * The widget POSTs { bundleId, type, sessionToken? } to record VIEW / ADD_TO_CART.
 */
import type { ActionFunctionArgs } from "react-router";
import { EventType } from "@prisma/client";

import { authenticate } from "../shopify.server";
import { recordStorefrontEvent } from "../services/events.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    bundleId?: string;
    type?: string;
    sessionToken?: string;
  } | null;

  if (!body?.bundleId || !body.type) {
    return Response.json({ ok: false });
  }

  await recordStorefrontEvent(
    session.shop,
    body.bundleId,
    body.type as EventType,
    body.sessionToken,
  );
  return Response.json({ ok: true });
};
