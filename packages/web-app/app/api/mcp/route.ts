import { registerCalendarTools } from "@/lib/mcp/calendar-tools";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { registerPlanTools } from "@/lib/mcp/tools";
import { registerCoachTools } from "@/lib/mcp/coach-tools";
import { verifyMcpToken } from "@/lib/mcp/token";
import { boundedMcpRequest } from "@/lib/mcp/body";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const handler = createMcpHandler(
  (server) => {
    registerPlanTools(server);
    registerCoachTools(server);
    registerCalendarTools(server);
  },
  {
    serverInfo: { name: "holpro", version: "1.1.0" },
    maxSubscriptions: 0,
  },
);
const authenticated = withMcpAuth(
  async (request) => {
    const bounded =
      request.method === "POST" ? await boundedMcpRequest(request) : request;
    if (!bounded)
      return Response.json({ error: "payload_too_large" }, { status: 413 });
    return handler(bounded);
  },
  (_request, token) => verifyMcpToken(token),
  { required: true },
);
export { authenticated as GET, authenticated as POST };
