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
export type Search = Promise<Record<string, string | string[] | undefined>>;
const first = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : undefined;
export async function LoginPage({
  portal,
  searchParams,
}: {
  portal: Portal;
  searchParams: Search;
}) {
  const query = await searchParams;
  const code = first(query.error);
  const message = authMessage(callbackError(code) ?? code, portal);
  const other = otherPortal(portal);
  return (
    <AuthShell portal={portal}>
      <h1>
        Welcome <em>back.</em>
      </h1>
      <p>Sign in or take your first step with HolPro.</p>
      {message && (
        <p role="alert" className="auth-notice">
          {message}
        </p>
      )}
      {query.reset === "ok" && (
        <p role="status" className="auth-notice">
          Password updated. Sign in.
        </p>
      )}
      <LoginForm portal={portal} />
      <Link href={other.basePath}>
        {other.key === "coach" ? "Coaches login" : "User login"}
      </Link>
    </AuthShell>
  );
}
export async function SentPage({
  portal,
  searchParams,
}: {
  portal: Portal;
  searchParams: Search;
}) {
  const query = await searchParams;
  const kind = first(query.kind);
  const copy =
    kind === "reset"
      ? "Follow the link to choose a new password."
      : kind === "verify"
        ? "Follow the link to verify your email."
        : "Follow the link to sign in. It expires in 5 minutes.";
  return (
    <AuthShell portal={portal}>
      <h1>
        Check your <em>inbox.</em>
      </h1>
      <p>If an account exists for this address, we sent a link.</p>
      <p>{copy}</p>
      <Link className="button button-secondary" href={portal.basePath}>
        Back to sign in
      </Link>
    </AuthShell>
  );
}
export async function ResetPage({
  portal,
  searchParams,
}: {
  portal: Portal;
  searchParams: Search;
}) {
  const query = await searchParams;
  const token = first(query.token);
  return (
    <AuthShell portal={portal}>
      <h1>
        A fresh <em>start.</em>
      </h1>
      {token && !query.error ? (
        <ResetForm portal={portal} token={token} />
      ) : (
        <>
          <p role="alert">{authMessage("link_invalid", portal)}</p>
          <Link href={portal.basePath}>Back to sign in</Link>
        </>
      )}
    </AuthShell>
  );
}
export async function WelcomePage({ portal }: { portal: Portal }) {
  const user = await requirePortalUser(portal, true);
  return (
    <AuthShell portal={portal}>
      <h1>
        Make it <em>yours.</em>
      </h1>
      <p>
        You are creating a {portal.key} account for {user.email}.
      </p>
      <WelcomeForm portal={portal} name={user.name} />
    </AuthShell>
  );
}
export async function HomePage({ portal }: { portal: Portal }) {
  const user = await requirePortalUser(portal);
  return (
    <main className="container auth-home">
      <span className="eyebrow">{portal.label}</span>
      <h1>Welcome, {user.name}</h1>
      <p>Your {portal.key} account is ready.</p>
      <form action={signOut}>
        <button className="button button-primary">Sign out</button>
      </form>
    </main>
  );
}
