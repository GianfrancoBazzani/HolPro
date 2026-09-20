import type { McpServer, AuthInfo } from "@modelcontextprotocol/server";
import { z } from "zod";
import { listPlans, readPlan, publishPlan } from "@/lib/plans/repository";
import { PlanAccessError } from "@/lib/plans/types";
import {
  listPlansSchema,
  readPlanSchema,
  publishPlanSchema,
  roleSchema,
} from "./schemas";
const actorSchema = z.object({ userId: z.string().min(1), role: roleSchema });
function actorFrom(auth?: AuthInfo, publish = false) {
  const actor = actorSchema.parse(auth?.extra);
  if (
    !auth?.scopes.includes("plans:read") ||
    (publish &&
      (actor.role !== "coach" || !auth.scopes.includes("plans:publish")))
  )
    throw new PlanAccessError();
  return actor;
}
async function result(action: () => Promise<unknown>) {
  try {
    const data = await action();
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data) }],
      ...(data && typeof data === "object" && !Array.isArray(data)
        ? { structuredContent: data as Record<string, unknown> }
        : {}),
    };
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text:
            error instanceof PlanAccessError
              ? "Plan or engagement not found or not accessible."
              : "Unable to complete the plan operation.",
        },
      ],
    };
  }
}
export function registerPlanTools(server: McpServer) {
  server.registerTool(
    "publish_plan",
    {
      title: "Publish plan",
      description:
        "Publish HTML as a new plan document or a new immutable version for an active owned engagement.",
      inputSchema: publishPlanSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    (input, ctx) =>
      result(() => publishPlan(actorFrom(ctx.http?.authInfo, true), input)),
  );
  server.registerTool(
    "list_plans",
    {
      title: "List plans",
      description: "List up to 200 accessible plan documents, newest first.",
      inputSchema: listPlansSchema,
      annotations: { readOnlyHint: true },
    },
    (input, ctx) =>
      result(() =>
        listPlans(actorFrom(ctx.http?.authInfo), input.engagementId),
      ),
  );
  server.registerTool(
    "read_plan",
    {
      title: "Read plan",
      description:
        "Read the current or a numbered HTML version of an accessible plan.",
      inputSchema: readPlanSchema,
      annotations: { readOnlyHint: true },
    },
    (input, ctx) =>
      result(() =>
        readPlan(actorFrom(ctx.http?.authInfo), input.planId, input.version),
      ),
  );
}
