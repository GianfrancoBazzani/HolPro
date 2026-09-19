export type PortalKey = "coachee" | "coach";
export type Portal = {
  key: PortalKey;
  basePath: "/login" | "/pro/login";
  homePath: "/app" | "/pro";
};
export const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3000";
export const portals: Record<PortalKey, Portal> = {
  coachee: {
    key: "coachee",
    basePath: "/login",
    homePath: "/app",
  },
  coach: {
    key: "coach",
    basePath: "/pro/login",
    homePath: "/pro",
  },
};
export const authMessages = {
  wrong_portal: (portal: Portal) => `error.wrong_portal.${portal.key}` as const,
  link_invalid: () => "error.link_invalid" as const,
  account_unavailable: () => "error.account_unavailable" as const,
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
const under = (path: string, base: string) =>
  path === base || path.startsWith(`${base}/`);
export function portalFromPath(path: string): Portal {
  return (
    Object.values(portals).find(
      (portal) => under(path, portal.homePath) || under(path, portal.basePath),
    ) ?? portals.coachee
  );
}
// Portal homes need a session; their login pages do not.
export function isProtectedPath(path: string) {
  return Object.values(portals).some(
    (portal) => under(path, portal.homePath) && !under(path, portal.basePath),
  );
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
