export type PortalKey = "coachee" | "coach";
export type Portal = {
  key: PortalKey;
  basePath: "/login" | "/pro/login";
  homePath: "/app" | "/pro";
  label: string;
  heading: string;
};
export const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3000";
export const portals: Record<PortalKey, Portal> = {
  coachee: {
    key: "coachee",
    basePath: "/login",
    homePath: "/app",
    label: "For you",
    heading: "Your next chapter starts here.",
  },
  coach: {
    key: "coach",
    basePath: "/pro/login",
    homePath: "/pro",
    label: "For coaches",
    heading: "Make room for meaningful change.",
  },
};
export const authMessages = {
  wrong_portal: (portal: Portal) =>
    `This account is not a ${portal.key} account. Use the other login.`,
  link_invalid: () => "This link is invalid or expired. Request a new one.",
  account_unavailable: () =>
    "This account is not available. Contact support.",
} satisfies Record<string, (portal: Portal) => string>;
export type AuthErrorCode = keyof typeof authMessages;
export function authMessage(code: string | undefined, portal: Portal) {
  return code && Object.hasOwn(authMessages, code)
    ? authMessages[code as AuthErrorCode](portal)
    : undefined;
}
export function portalByKey(key: string | null | undefined) {
  return key === "coach" || key === "coachee" ? portals[key] : undefined;
}
export function otherPortal(portal: Portal) {
  return portal.key === "coach" ? portals.coachee : portals.coach;
}
export function portalFromPath(path: string): Portal {
  return path === "/pro" || path.startsWith("/pro/")
    ? portals.coach
    : portals.coachee;
}
export function portalUrls(portal: Portal) {
  return {
    home: portal.homePath,
    login: (error?: AuthErrorCode) =>
      error ? `${portal.basePath}?error=${error}` : portal.basePath,
    resetOk: `${portal.basePath}?reset=ok`,
    reset: `${portal.basePath}/reset`,
    welcome: `${portal.basePath}/welcome`,
    sent: (kind: "magic" | "verify" | "reset") =>
      `${portal.basePath}/sent?kind=${kind}`,
    reject: (blocked = false) =>
      `/api/gate/reject?portal=${portal.key}${blocked ? "&reason=account_unavailable" : ""}`,
  };
}
export function callbackError(code: string | null | undefined) {
  return [
    "invalid_token",
    "token_expired",
    "INVALID_TOKEN",
    "TOKEN_EXPIRED",
  ].includes(code ?? "")
    ? "link_invalid"
    : undefined;
}
export function rejectDestination(key: string | null, reason: string | null) {
  const portal = portalByKey(key) ?? portals.coachee;
  return portalUrls(portal).login(
    reason === "account_unavailable" ? "account_unavailable" : "wrong_portal",
  );
}
export function portalFromCallback(url: string): Portal {
  try {
    const parsed = new URL(url, baseURL);
    const callback =
      parsed.searchParams.get("callbackURL") ??
      parsed.searchParams.get("redirectTo");
    const target = callback ? new URL(callback, baseURL) : parsed;
    return target.origin === new URL(baseURL).origin
      ? portalFromPath(target.pathname)
      : portals.coachee;
  } catch {
    return portals.coachee;
  }
}
