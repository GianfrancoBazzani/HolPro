"use server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { loadUserWithRoles } from "@/lib/auth/repository";
import { isBlocked, roleOf } from "@/lib/auth/policy";
import { safeTimezone } from "@/lib/pro/dates";
import { telegramConfig } from "./config";
import {
  findUserLink,
  requestLink,
  cancelLink,
  type TelegramLink,
} from "./links";
import { exclusive, linkKeys } from "./lifecycle";
import type { LinkResult, LinkView } from "./state";
async function actor(allowBlocked = false) {
  const session = await auth.api.getSession({
    headers: await headers(),
    query: { disableRefresh: true, disableCookieCache: true },
  });
  if (!session) throw new Error("unauthorized");
  const user = await loadUserWithRoles(session.user.id);
  if (!user || (!allowBlocked && isBlocked(user)))
    throw new Error("unauthorized");
  return user;
}
function view(link: TelegramLink | undefined, timezone: string): LinkView {
  if (!link) return { state: "disconnected" };
  if (link.revokedAt) return { state: "revoked" };
  if (link.linkedAt)
    return {
      state: "connected",
      role: link.role,
      username: link.telegramUsername,
      linkedAt: link.linkedAt.toISOString(),
      timezone: safeTimezone(timezone),
    };
  return {
    state: "pending",
    id: link.id,
    expiresAt: link.tokenExpiresAt!.toISOString(),
    timezone: safeTimezone(timezone),
  };
}
export async function getTelegramLink(): Promise<LinkResult> {
  try {
    const user = await actor();
    if (!telegramConfig()) return { state: "disabled" };
    return view(await findUserLink(user.id), user.timezone);
  } catch {
    return { error: "telegram.error" };
  }
}
export async function requestTelegramLink(role: string): Promise<LinkResult> {
  try {
    const user = await actor();
    const config = telegramConfig();
    if (!config) return { error: "telegram.unavailable" };
    if ((role !== "coach" && role !== "coachee") || !roleOf(user, role))
      return { error: "telegram.error" };
    return await exclusive(linkKeys(user.id), async () => {
      const result = await requestLink(user.id, role);
      const state = view(result.link, user.timezone);
      return state.state === "pending" && result.token
        ? {
            ...state,
            url: `https://t.me/${config.userName}?start=${result.token}`,
          }
        : state;
    });
  } catch {
    return { error: "telegram.error" };
  }
}
export async function cancelTelegramLink(id: string): Promise<LinkResult> {
  try {
    const user = await actor();
    if (typeof id !== "string" || id.length > 36)
      return { error: "telegram.error" };
    await exclusive(linkKeys(user.id), () => cancelLink(user.id, id));
    return view(await findUserLink(user.id), user.timezone);
  } catch {
    return { error: "telegram.error" };
  }
}
export async function removeTelegramLink(): Promise<LinkResult> {
  try {
    const user = await actor(true);
    const { removeLink } = await import("./runtime");
    await removeLink(user.id);
    return view(await findUserLink(user.id), user.timezone);
  } catch {
    return { error: "telegram.error" };
  }
}
