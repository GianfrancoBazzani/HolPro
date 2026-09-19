"use server";
import { currentLocale } from "../i18n/request";
import {
  getDictionary,
  translator,
  type Dictionary,
  type Translator,
} from "../i18n/dictionary";
import type { Locale } from "../i18n/config";
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
  limits,
  emailSchema,
  signInSchema,
  signUpSchema,
  resetSchema,
  registrationSchema,
  type ActionState,
} from "./schemas";
import { registerRole } from "./repository";
const errorCopy: Record<string, keyof Dictionary["auth"]> = {
  RATE_LIMITED: "error.rate_limited",
  INVALID_EMAIL_OR_PASSWORD: "error.credentials",
  INVALID_PASSWORD: "error.credentials",
  INVALID_EMAIL: "error.credentials",
  ACCOUNT_UNAVAILABLE: authMessages.account_unavailable(),
  INVALID_TOKEN: authMessages.link_invalid(),
  TOKEN_EXPIRED: authMessages.link_invalid(),
};
function failure(error: unknown, t: Translator<"auth">): ActionState {
  const code =
    error instanceof APIError
      ? error.status === "TOO_MANY_REQUESTS"
        ? "RATE_LIMITED"
        : error.body?.code
      : undefined;
  if (code && Object.hasOwn(errorCopy, code))
    return { error: t(errorCopy[code]) };
  console.error("Authentication action failed.", error);
  return { error: t("error.generic") };
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
  run: (portal: Portal, data: z.output<S>, locale: Locale) => Promise<string>,
  onError?: (error: unknown, data: z.output<S>) => ActionState | string | void,
): Promise<ActionState> {
  const portal = portalByKey(key);
  if (!portal) throw new Error("Invalid portal");
  const locale = await currentLocale();
  const dictionary = await getDictionary(locale);
  const messages = dictionary.auth;
  const t = translator(dictionary, "auth");
  const values = {
    nameMin: limits.name.min,
    nameMax: limits.name.max,
    passwordMin: limits.password.min,
    passwordMax: limits.password.max,
  };
  const translate = (message: string) =>
    t(
      Object.hasOwn(messages, message)
        ? (message as keyof typeof messages)
        : "validation.invalid",
      values,
    );
  const value = schema.safeParse(Object.fromEntries(form));
  if (!value.success)
    return {
      fields: Object.fromEntries(
        Object.entries(z.flattenError(value.error).fieldErrors).map(
          ([field, errors]) => [
            field,
            (errors as string[] | undefined)?.map(translate),
          ],
        ),
      ),
    };
  let target: string;
  try {
    target = await run(portal, value.data, locale);
  } catch (error) {
    const handled = onError?.(error, value.data);
    if (typeof handled !== "string")
      return handled
        ? {
            ...handled,
            error: handled.error ? translate(handled.error) : undefined,
          }
        : failure(error, t);
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
        ? { error: "error.verify", verifyEmail: data.email }
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
      isCode(
        error,
        "USER_ALREADY_EXISTS",
        "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
      )
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
  return formAction(
    key,
    form,
    registrationSchema,
    async (portal, data, locale) => {
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
        locale,
      );
      if (result === "blocked") return urls.reject;
      if (result === "reject") return urls.switch;
      return urls.home;
    },
  );
}
export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
