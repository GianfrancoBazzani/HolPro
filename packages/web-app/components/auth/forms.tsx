"use client";
import { useActionState, useState, type InputHTMLAttributes } from "react";
import Link from "next/link";
import type { Portal } from "@/lib/auth/portals";
import { limits, type ActionState } from "@/lib/auth/schemas";
import {
  sendMagicLink,
  signInWithPassword,
  signUpWithPassword,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  completeRegistration,
} from "@/lib/auth/actions";
type FormAction = (state: ActionState, form: FormData) => Promise<ActionState>;
type Mode = keyof typeof modes;
const modes = {
  magic: { action: sendMagicLink, label: "Email me a link" },
  signin: { action: signInWithPassword, label: "Sign in" },
  signup: { action: signUpWithPassword, label: "Create account" },
  forgot: { action: requestPasswordReset, label: "Send reset link" },
};
function Field({
  name,
  label,
  state,
  ...props
}: {
  name: string;
  label: string;
  state: ActionState;
} & InputHTMLAttributes<HTMLInputElement>) {
  const errors = state.fields?.[name];
  return (
    <div className="auth-field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        aria-invalid={!!errors}
        aria-describedby={errors ? `${name}-error` : undefined}
        {...props}
      />
      {errors && (
        <p className="auth-error" id={`${name}-error`}>
          {errors.join(" ")}
        </p>
      )}
    </div>
  );
}
function NameField({ state, ...props }: { state: ActionState } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field
      name="name"
      label="Full name"
      state={state}
      autoComplete="name"
      required
      minLength={limits.name.min}
      maxLength={limits.name.max}
      {...props}
    />
  );
}
function PasswordField({
  state,
  fresh,
  label = "Password",
}: {
  state: ActionState;
  fresh: boolean;
  label?: string;
}) {
  return (
    <Field
      name="password"
      label={label}
      type="password"
      state={state}
      autoComplete={fresh ? "new-password" : "current-password"}
      required
      minLength={limits.password.min}
      maxLength={limits.password.max}
    />
  );
}
function Switch({
  to,
  onSelect,
  children,
}: {
  to: Mode;
  onSelect: (mode: Mode) => void;
  children: string;
}) {
  return (
    <button className="auth-switch" type="button" onClick={() => onSelect(to)}>
      {children}
    </button>
  );
}
function ErrorMessage({ state }: { state: ActionState }) {
  return state.error ? (
    <p role="alert" className="auth-notice">
      {state.error}
    </p>
  ) : null;
}
function Submit({
  pending,
  children,
}: {
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <button className="button button-primary" disabled={pending} type="submit">
      {pending ? "Please wait…" : children}
    </button>
  );
}
function ResendForm({ portal, email }: { portal: Portal; email: string }) {
  const [state, action, pending] = useActionState(
    resendVerification.bind(null, portal.key),
    {},
  );
  return (
    <form className="auth-form" action={action}>
      <input type="hidden" name="email" value={email} />
      <ErrorMessage state={state} />
      <Submit pending={pending}>Resend verification email</Submit>
    </form>
  );
}
function CredentialForm({ portal, mode }: { portal: Portal; mode: Mode }) {
  const [state, action, pending] = useActionState(
    modes[mode].action.bind(null, portal.key) as FormAction,
    {},
  );
  const withPassword = mode === "signin" || mode === "signup";
  return (
    <>
      <form action={action} className="auth-form">
        {mode === "signup" && <NameField state={state} />}
        <Field
          name="email"
          label="Email"
          type="email"
          state={state}
          autoComplete="email"
          required
          maxLength={limits.email.max}
        />
        {withPassword && (
          <PasswordField state={state} fresh={mode === "signup"} />
        )}
        {mode === "signup" && (
          <p>
            Use {limits.password.min} to {limits.password.max} characters for
            your password.
          </p>
        )}
        <ErrorMessage state={state} />
        <Submit pending={pending}>{modes[mode].label}</Submit>
      </form>
      {state.verifyEmail && (
        <ResendForm portal={portal} email={state.verifyEmail} />
      )}
    </>
  );
}
export function LoginForm({ portal }: { portal: Portal }) {
  const [mode, setMode] = useState<Mode>("magic");
  return (
    <>
      <div className="auth-tabs" aria-label="Sign-in method">
        <button
          className="button"
          type="button"
          aria-pressed={mode === "magic"}
          onClick={() => setMode("magic")}
        >
          Email me a link
        </button>
        <button
          className="button"
          type="button"
          aria-pressed={mode !== "magic"}
          onClick={() => setMode("signin")}
        >
          Password
        </button>
      </div>
      {mode === "forgot" && (
        <p>Enter your email to request a password reset.</p>
      )}
      <CredentialForm key={mode} portal={portal} mode={mode} />
      {mode === "signin" && (
        <>
          <Switch to="signup" onSelect={setMode}>
            New here? Create an account
          </Switch>
          <Switch to="forgot" onSelect={setMode}>
            Forgot password?
          </Switch>
        </>
      )}
      {(mode === "signup" || mode === "forgot") && (
        <Switch to="signin" onSelect={setMode}>
          Back to sign in
        </Switch>
      )}
    </>
  );
}
export function ResetForm({
  portal,
  token,
}: {
  portal: Portal;
  token: string;
}) {
  const [state, action, pending] = useActionState(
    resetPassword.bind(null, portal.key),
    {},
  );
  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="token" value={token} />
      <PasswordField state={state} fresh label="New password" />
      <Field
        name="confirmPassword"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        state={state}
        required
      />
      <ErrorMessage state={state} />
      <Submit pending={pending}>Update password</Submit>
      <Link href={portal.basePath}>Request a new link</Link>
    </form>
  );
}
export function WelcomeForm({
  portal,
  name,
}: {
  portal: Portal;
  name: string;
}) {
  const [state, action, pending] = useActionState(
    completeRegistration.bind(null, portal.key),
    {},
  );
  // The browser timezone travels with the form. The server falls back to UTC.
  return (
    <form
      action={(form) => {
        form.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
        action(form);
      }}
      className="auth-form"
    >
      <NameField state={state} defaultValue={name} />
      <ErrorMessage state={state} />
      <Submit pending={pending}>Continue</Submit>
    </form>
  );
}
