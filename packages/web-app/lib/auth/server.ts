import { defaultLocale, hasLocale } from "../i18n/config";
import { preferredLocale } from "../i18n/negotiate";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "@holpro/db";
import {
  activateVerifiedUser,
  loadUserStatus,
  loadUserLocaleByEmail,
} from "./repository";
import { isBlocked } from "./policy";
import { baseURL as appURL, portalFromCallback, portalUrls } from "./portals";
import { limits } from "./schemas";
import { deliverAuthEmail } from "../email/resend";
import * as templates from "../email/templates";
const baseURL = process.env.BETTER_AUTH_URL;
if (process.env.NODE_ENV === "production" && !baseURL)
  throw new Error("BETTER_AUTH_URL is required in production.");
// CIDR ranges of the reverse proxies that append to x-forwarded-for.
const trustedProxies = (process.env.TRUSTED_PROXIES ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
type Template = (typeof templates)[keyof typeof templates];
async function sendTemplate(
  template: Template,
  to: string,
  url: string,
  request?: Request,
  user?: { email: string; locale?: string },
) {
  const requested = request && preferredLocale(request.headers);
  const stored = requested
    ? undefined
    : (user?.locale ?? (await loadUserLocaleByEmail(to)));
  const locale = requested ?? (hasLocale(stored) ? stored : defaultLocale);
  await deliverAuthEmail({
    to,
    ...(await template({ url, portal: portalFromCallback(url), locale })),
  });
}
export const auth = betterAuth({
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: baseURL ? [baseURL] : [],
  database: drizzleAdapter(db, { provider: "mysql", usePlural: true, schema }),
  advanced: {
    database: { generateId: "uuid" },
    ipAddress: { ipAddressHeaders: ["x-forwarded-for"], trustedProxies },
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  user: {
    additionalFields: {
      locale: { type: "string", defaultValue: "en", input: false },
      timezone: { type: "string", defaultValue: "UTC", input: false },
      status: { type: "string", defaultValue: "pending", input: false },
      emailVerifiedAt: { type: "date", required: false, input: false },
      deletedAt: { type: "date", required: false, input: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: limits.password.min,
    maxPasswordLength: limits.password.max,
    autoSignIn: false,
    resetPasswordTokenExpiresIn: 900,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }, request) =>
      sendTemplate(templates.resetPassword, user.email, url, request, user),
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }, request) =>
      sendTemplate(templates.verifyEmail, user.email, url, request, user),
  },
  session: {
    expiresIn: 7 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
    cookieCache: { enabled: true, maxAge: 300 },
  },
  rateLimit: {
    enabled: process.env.NODE_ENV !== "test",
    storage: "database",
    modelName: "rateLimit",
    customRules: {
      "/request-password-reset": { window: 60, max: 3 },
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
      "/send-verification-email": { window: 60, max: 3 },
    },
  },
  // A verified email activates the user. Magic link sign-ups arrive verified
  // (create), password sign-ups get verified later (update).
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({
          data: user.emailVerified
            ? { ...user, status: "active", emailVerifiedAt: new Date() }
            : user,
        }),
      },
      update: {
        after: async (user) => {
          if (user.emailVerified && user.status === "pending")
            await activateVerifiedUser(user.id);
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          if (isBlocked(await loadUserStatus(session.userId)))
            throw new APIError("FORBIDDEN", {
              code: "ACCOUNT_UNAVAILABLE",
              message: "Account unavailable",
            });
          return { data: session };
        },
      },
    },
  },
  // A blocked user who opens a magic link or a verification link would get a
  // JSON 403 from these GET endpoints. Send them to the portal login instead.
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      const returned = ctx.context.returned;
      if (
        ctx.method === "GET" &&
        returned instanceof APIError &&
        returned.body?.code === "ACCOUNT_UNAVAILABLE"
      ) {
        const portal = portalFromCallback(ctx.request?.url ?? "");
        throw ctx.redirect(
          new URL(portalUrls(portal).login("account_unavailable"), appURL).href,
        );
      }
    }),
  },
  plugins: [
    magicLink({
      expiresIn: 300,
      disableSignUp: false,
      rateLimit: { window: 60, max: 3 },
      storeToken: "hashed",
      sendMagicLink: async ({ email, url }, ctx) =>
        sendTemplate(templates.magicLink, email, url, ctx?.request),
    }),
    nextCookies(),
  ],
});
