import type { PortalKey } from "@/lib/auth/portals";
// Scopes are derived from the current role on every request (token.ts), never
// stored in the token. Add a scope here and check it in the tool handler.
export const scopesByRole = {
  coachee: ["plans:read", "coaches:search", "onboarding:apply"],
  coach: ["plans:read", "plans:publish", "onboarding:review"],
} as const satisfies Record<PortalKey, readonly string[]>;
export type McpScope = (typeof scopesByRole)[PortalKey][number];
export const scopesFor = (role: PortalKey): string[] => [
  ...scopesByRole[role],
];
