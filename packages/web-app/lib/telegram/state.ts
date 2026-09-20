import type { PortalKey } from "@/lib/auth/portals";
export type LinkView =
  | { state: "disabled" | "disconnected" | "revoked" }
  | {
      state: "pending";
      id: string;
      expiresAt: string;
      timezone: string;
      url?: string;
    }
  | {
      state: "connected";
      role: PortalKey;
      username: string | null;
      linkedAt: string;
      timezone: string;
    };
export type LinkResult =
  | LinkView
  | { error: "telegram.error" | "telegram.unavailable" };
