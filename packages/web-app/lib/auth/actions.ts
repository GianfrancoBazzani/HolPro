"use server";
import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { auth } from "./server";
import { authRequest } from "./request";
import {
  authMessages,
  portalByKey,
  portalUrls,
  type Portal,
  type PortalKey,
} from "./portals";
import {
  emailSchema,
  signInSchema,
  signUpSchema,
  resetSchema,
  registrationSchema,
  type ActionState,
} from "./schemas";
import { registerRole } from "./repository";
const errorCopy: Record<string, string> = {
  RATE_LIMITED: "Too many requests. Please wait a minute and try again.",
  INVALID_EMAIL_OR_PASSWORD: "The email or password is incorrect.",
  INVALID_PASSWORD: "The email or password is incorrect.",
  INVALID_EMAIL: "The email or password is incorrect.",
  ACCOUNT_UNAVAILABLE: authMessages.account_unavailable(),
  INVALID_TOKEN: authMessages.link_invalid(),
  TOKEN_EXPIRED: authMessages.link_invalid(),
};
function failure(error: unknown): ActionState {
  const code =
    error instanceof APIError
      ? error.status === "TOO_MANY_REQUESTS"
        ? "RATE_LIMITED"
        : error.body?.code
      : undefined;
  if (code && Object.hasOwn(errorCopy, code)) return { error: errorCopy[code] };
  console.error("Authentication action failed.", error);
  return { error: "Something went wrong. Try again." };
}
function isCode(error: unknown, ...codes: string[]) {
  return error instanceof APIError && codes.includes(error.body?.code ?? "");
}
// Shared shape of every form action: resolve the portal, validate, run, then
// redirect. `run` returns the redirect target. `onError` may return a state to
// show or a target to redirect to; anything else falls back to `failure`.
async function formAction<S extends z.ZodType>(
  key: PortalKey,
  form: FormData,
  schema: S,
  run: (portal: Portal, data: z.output<S>) => Promise<string>,
  onError?: (error: unknown, data: z.output<S>) => ActionState | string | void,
): Promise<ActionState> {
  const portal = portalByKey(key);
  if (!portal) throw new Error("Invalid portal");
  const value = schema.safeParse(Object.fromEntries(form));
  if (!value.success)
    return { fields: z.flattenError(value.error).fieldErrors };
  let target: string;
  try {
    target = await run(portal, value.data);
  } catch (error) {
    const handled = onError?.(error, value.data);
    if (typeof handled !== "string") return handled ?? failure(error);
    target = handled;
  }
  redirect(target);
}
export async function sendMagicLink(
  key: PortalKey,
  _state: ActionState,
  form: FormData,
) {
  return formAction(key, form, emailSchema, async (portal, data) => {
    const urls = portalUrls(portal);
    await authRequest("/sign-in/magic-link", {
      ...data,
      callbackURL: urls.home,
      newUserCallbackURL: urls.home,
      errorCallbackURL: urls.login("link_invalid"),
    });
    return urls.sent("magic");
  });
}
export async function signInWithPassword(
  key: PortalKey,
  _state: ActionState,
  form: FormData,
) {
  return formAction(
    key,
    form,
    signInSchema,
    async (portal, data) => {
      await authRequest("/sign-in/email", {
        ...data,
        callbackURL: portal.homePath,
      });
      return portal.homePath;
    },
    (error, data) =>
      isCode(error, "EMAIL_NOT_VERIFIED")
        ? { error: "Verify your email first.", verifyEmail: data.email }
        : undefined,
  );
}
export async function signUpWithPassword(
  key: PortalKey,
  _state: ActionState,
  form: FormData,
) {
  return formAction(
    key,
    form,
    signUpSchema,
    async (portal, data) => {
      await authRequest("/sign-up/email", {
        ...data,
        callbackURL: portal.homePath,
      });
      return portalUrls(portal).sent("verify");
    },
    // An existing account gets the same answer, so sign-up cannot reveal it.
    (error) =>
      isCode(error, "USER_ALREADY_EXISTS", "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL")
        ? portalUrls(portalByKey(key)!).sent("verify")
        : undefined,
  );
}
export async function resendVerification(
  key: PortalKey,
  _state: ActionState,
  form: FormData,
) {
  return formAction(key, form, emailSchema, async (portal, data) => {
    await authRequest("/send-verification-email", {
      ...data,
      callbackURL: portal.homePath,
    });
    return portalUrls(portal).sent("verify");
  });
}
export async function requestPasswordReset(
  key: PortalKey,
  _state: ActionState,
  form: FormData,
) {
  return formAction(key, form, emailSchema, async (portal, data) => {
    const urls = portalUrls(portal);
    await authRequest("/request-password-reset", {
      ...data,
      redirectTo: urls.reset,
    });
    return urls.sent("reset");
  });
}
export async function resetPassword(
  key: PortalKey,
  _state: ActionState,
  form: FormData,
) {
  return formAction(key, form, resetSchema, async (portal, data) => {
    await authRequest("/reset-password", {
      token: data.token,
      newPassword: data.password,
    });
    return portalUrls(portal).resetOk;
  });
}
export async function completeRegistration(
  key: PortalKey,
  _state: ActionState,
  form: FormData,
) {
  return formAction(key, form, registrationSchema, async (portal, data) => {
    const urls = portalUrls(portal);
    const session = await auth.api.getSession({
      headers: await headers(),
      query: { disableCookieCache: true },
    });
    if (!session) return urls.login();
    const result = await registerRole(
      session.user.id,
      portal,
      data.name,
      data.timezone,
    );
    if (result === "blocked" || result === "reject")
      return urls.reject(result === "blocked");
    return urls.home;
  });
}
export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
