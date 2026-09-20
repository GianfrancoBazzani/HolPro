import type { McpServer } from "@modelcontextprotocol/server";
import {
  listPlans,
  readPlan,
  readPlanDraft,
  submitPlanDraft,
} from "@/lib/plans/repository";
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
        "Submit HTML as a draft for coach review in HolPro. The coachee sees it only after approval. With planId, replace any pending draft.",
      inputSchema: publishPlanSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
      },
    },
    (input, ctx) =>
      mcpResult(
        () =>
          submitPlanDraft(
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
      description:
        "List up to 200 accessible plan documents, newest first. A coachee sees a plan only after coach approval. Coaches also see pending drafts.",
      inputSchema: listPlansSchema,
      annotations: { readOnlyHint: true },
    },
    (input, ctx) =>
      mcpResult(
        () =>
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
        "Read an approved HTML version, or use draft:true to read the pending draft as its coach.",
      inputSchema: readPlanSchema,
      annotations: { readOnlyHint: true },
    },
    (input, ctx) =>
      mcpResult(
        () =>
          input.draft
            ? readPlanDraft(
                requireScope(ctx.http?.authInfo, "plans:read", "plans:publish"),
                input.planId,
              )
            : readPlan(
                requireScope(ctx.http?.authInfo, "plans:read"),
                input.planId,
                input.version,
              ),
        messages,
      ),
  );
}
