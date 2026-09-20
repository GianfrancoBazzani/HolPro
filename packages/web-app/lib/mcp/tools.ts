import type { McpServer } from "@modelcontextprotocol/server";
import { listPlans, readPlan, publishPlan } from "@/lib/plans/repository";
import { requireScope } from "./actor";
import { mcpResult } from "./result";
import { listPlansSchema, readPlanSchema, publishPlanSchema } from "./schemas";
const messages = {
  denied: "Plan or engagement not found or not accessible.",
  failed: "Unable to complete the plan operation.",
};
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
      mcpResult(() =>
        publishPlan(
          requireScope(ctx.http?.authInfo, "plans:read", "plans:publish"),
          input,
        ),
      messages,
      ),
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
      mcpResult(() =>
        listPlans(
          requireScope(ctx.http?.authInfo, "plans:read"),
          input.engagementId,
        ),
      messages,
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
      mcpResult(() =>
        readPlan(
          requireScope(ctx.http?.authInfo, "plans:read"),
          input.planId,
          input.version,
        ),
      messages,
      ),
  );
}
