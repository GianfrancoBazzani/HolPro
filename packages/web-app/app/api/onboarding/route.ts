import { z } from "zod";
import {
  requireAssistantUser,
  unauthorized,
  invalidInput,
} from "@/lib/assistant/session";
import { listOnboarding, retryOnboarding } from "@/lib/onboarding/repository";
import {
  listNotifications,
  hasPushSubscription,
  markNotificationRead,
  savePushSubscription,
  removePushSubscription,
} from "@/lib/notifications/repository";
import { baseURL } from "@/lib/auth/portals";
import { pushInput, pushPublicKey } from "@/lib/notifications/push-input";
import { readBoundedBody } from "@/lib/http/bounded-body";
import { limits } from "@/lib/assistant/limits";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const session = await requireAssistantUser(request);
  if (!session) return unauthorized();
  const actor = { userId: session.user.id, role: session.role };
  const [requests, notifications, pushSubscribed] = await Promise.all([
    listOnboarding(actor),
    listNotifications(actor.userId),
    hasPushSubscription(actor.userId, session.sessionId),
  ]);
  return Response.json(
    { requests, notifications, pushSubscribed, pushPublicKey: pushPublicKey() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
const mutation = z.discriminatedUnion("action", [
  z.object({ action: z.literal("retry"), id: z.uuid() }),
  z.object({ action: z.literal("read"), id: z.uuid() }),
  z.object({ action: z.literal("subscribe"), subscription: pushInput }),
  z.object({
    action: z.literal("unsubscribe"),
    endpoint: z.string().max(2048),
  }),
]);
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(baseURL).origin)
    return new Response(null, { status: 403 });
  const session = await requireAssistantUser(request);
  if (!session) return unauthorized();
  // Enforce the limit even for chunked requests without Content-Length.
  const bytes = await readBoundedBody(request, limits.jsonRequestBytes);
  if (!bytes) return new Response(null, { status: 413 });
  let input: ReturnType<typeof mutation.safeParse>;
  try {
    input = mutation.safeParse(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return invalidInput();
  }
  if (!input.success) return invalidInput();
  const data = input.data,
    actor = { userId: session.user.id, role: session.role };
  if (data.action === "retry") await retryOnboarding(actor, data.id);
  if (data.action === "read") await markNotificationRead(actor.userId, data.id);
  if (data.action === "subscribe") {
    if (!pushPublicKey()) return new Response(null, { status: 503 });
    await savePushSubscription(
      actor.userId,
      session.sessionId,
      data.subscription,
    );
  }
  if (data.action === "unsubscribe")
    await removePushSubscription(actor.userId, data.endpoint);
  return Response.json({ ok: true });
}
