import Link from "next/link";
import { AuthShell } from "./auth-shell";
import { LoginForm, ResetForm, WelcomeForm } from "./forms";
import {
  authMessage,
  callbackError,
  otherPortal,
  type Portal,
} from "@/lib/auth/portals";
import { requirePortalUser } from "@/lib/auth/gate";
import { signOut } from "@/lib/auth/actions";
import { getDictionary, translator } from "@/lib/i18n/dictionary";
import { pageLocale, type LocaleParams } from "@/lib/i18n/page";
import { Rich } from "@/components/i18n/rich";
export type Search = Promise<Record<string, string | string[] | undefined>>;
export type PageProps = { params: LocaleParams; searchParams: Search };
type Props = { portal: Portal } & PageProps;
const first = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : undefined;
async function copy(params: LocaleParams) {
  const locale = await pageLocale(params);
  const messages = await getDictionary(locale);
  return { locale, messages, t: translator(messages, "auth") };
}
export async function LoginPage({ portal, params, searchParams }: Props) {
  const query = await searchParams;
  const code = first(query.error);
  const message = authMessage(callbackError(code) ?? code);
  const other = otherPortal(portal);
  const { locale, t, messages } = await copy(params);
  return (
    <AuthShell portal={portal} locale={locale} messages={messages}>
      <h1>
        <Rich text={t("login.title")} />
      </h1>
      <p>{t("login.body")}</p>
      {message && (
        <p role="alert" className="auth-notice">
          {t(message)}
        </p>
      )}
      {query.reset === "ok" && (
        <p role="status" className="auth-notice">
          {t("login.reset")}
        </p>
      )}
      <LoginForm portal={portal} />
      <Link href={other.basePath}>{t(`login.${other.key}`)}</Link>
    </AuthShell>
  );
}
export async function SentPage({ portal, params, searchParams }: Props) {
  const query = await searchParams;
  const kind = first(query.kind);
  const { locale, t, messages } = await copy(params);
  return (
    <AuthShell portal={portal} locale={locale} messages={messages}>
      <h1>
        <Rich text={t("sent.title")} />
      </h1>
      <p>{t("sent.body")}</p>
      <p>
        {t(
          kind === "reset"
            ? "sent.reset"
            : kind === "verify"
              ? "sent.verify"
              : "sent.magic",
        )}
      </p>
      <Link className="button button-secondary" href={portal.basePath}>
        {t("login.back")}
      </Link>
    </AuthShell>
  );
}
export async function ResetPage({ portal, params, searchParams }: Props) {
  const query = await searchParams;
  const token = first(query.token);
  const { locale, t, messages } = await copy(params);
  return (
    <AuthShell portal={portal} locale={locale} messages={messages}>
      <h1>
        <Rich text={t("reset.title")} />
      </h1>
      {token && !query.error ? (
        <ResetForm portal={portal} token={token} />
      ) : (
        <>
          <p role="alert">{t("error.link_invalid")}</p>
          <Link href={portal.basePath}>{t("login.back")}</Link>
        </>
      )}
    </AuthShell>
  );
}
export async function WelcomePage({ portal, params }: Props) {
  const user = await requirePortalUser(portal, "welcome");
  const { locale, t, messages } = await copy(params);
  return (
    <AuthShell portal={portal} locale={locale} messages={messages}>
      <h1>
        <Rich text={t("welcome.title")} />
      </h1>
      <p>{t(`welcome.body.${portal.key}`, { email: user.email })}</p>
      <WelcomeForm portal={portal} name={user.name} />
    </AuthShell>
  );
}
// A signed-in user who holds only the other role. The session stays alive.
export async function SwitchPage({ portal, params }: Props) {
  const user = await requirePortalUser(portal, "switch");
  const other = otherPortal(portal);
  const { locale, t, messages } = await copy(params);
  return (
    <AuthShell portal={portal} locale={locale} messages={messages}>
      <h1>
        <Rich text={t(`switch.title.${portal.key}`)} />
      </h1>
      <p>{t(`switch.body.${portal.key}`, { email: user.email })}</p>
      <div className="button-group">
        <Link className="button button-primary" href={other.homePath}>
          {t(`switch.go.${portal.key}`)}
        </Link>
        <form action={signOut}>
          <button className="button button-secondary">
            {t("switch.signout")}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
