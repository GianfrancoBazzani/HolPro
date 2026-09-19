"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary, Namespace, Translator } from "@/lib/i18n/dictionary";
import { format } from "@/lib/i18n/format";
type Context = { locale: Locale; messages: Partial<Dictionary> };
const I18nContext = createContext<Context | null>(null);
export function I18nProvider({
  locale,
  messages,
  children,
}: Context & { children: ReactNode }) {
  const parent = useContext(I18nContext);
  return (
    <I18nContext.Provider
      value={{ locale, messages: { ...parent?.messages, ...messages } }}
    >
      {children}
    </I18nContext.Provider>
  );
}
function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("I18nProvider is required");
  return context;
}
export function useLocale() {
  return useI18n().locale;
}
export function useT<N extends Namespace>(namespace: N): Translator<N> {
  const messages = useI18n().messages[namespace];
  if (!messages) throw new Error(`Missing translation namespace: ${namespace}`);
  return (key, values) =>
    format((messages as Dictionary[N])[key] as string, values);
}
