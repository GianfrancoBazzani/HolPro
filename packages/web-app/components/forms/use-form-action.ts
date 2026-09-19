"use client";
import { useActionState, useLayoutEffect, useRef } from "react";
import { useT } from "@/components/i18n/provider";
import type { ProAction, ProActionState } from "@/lib/pro/types";
export function useFormAction(action: ProAction) {
  const t = useT("pro"),
    formRef = useRef<HTMLFormElement>(null);
  // React resets forms even when an action returns a validation/error state.
  // A native listener is needed: synthetic events are suppressed during commit.
  // Success closes the dialog; failure must retain every field, including selects.
  useLayoutEffect(() => {
    const form = formRef.current;
    const preserve = (event: Event) => event.preventDefault();
    form?.addEventListener("reset", preserve);
    return () => form?.removeEventListener("reset", preserve);
  }, []);
  const [state, submit, pending] = useActionState(
    async (state: ProActionState, form: FormData) => {
      try {
        return await action(state, form);
      } catch {
        return { ok: false, error: t("error.generic") };
      }
    },
    {},
  );
  return [state, submit, pending, formRef] as const;
}
