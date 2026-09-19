"use client";
import { useSyncExternalStore } from "react";
import { type Locale, localeCookie } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { matchLocale } from "@/lib/i18n/negotiate";
import { format } from "@/lib/i18n/format";
import { chooseLocale } from "@/lib/i18n/actions";
export type Hints = Record<Locale, Dictionary["language"]>;
const subscribe = () => () => {};
function preference() {
  if (
    document.cookie
      .split(";")
      .some((part) => part.trim().startsWith(`${localeCookie}=`))
  )
    return undefined;
  return matchLocale(navigator.languages);
}
export function LocaleHint({
  current,
  hints,
}: {
  current: Locale;
  hints: Hints;
}) {
  const best = useSyncExternalStore(subscribe, preference, () => undefined);
  if (!best || best === current) return null;
  const copy = hints[best];
  const language =
    new Intl.DisplayNames(best, { type: "language" }).of(current) ?? current;
  return (
    <aside
      className="locale-hint"
      lang={best}
      role="region"
      aria-label={copy["hint.prefer"]}
    >
      <span>{copy["hint.prefer"]}</span>
      <form action={chooseLocale}>
        <input type="hidden" name="locale" value={best} />
        <input type="hidden" name="next" value="/" />
        <button type="submit">{copy["hint.switch"]}</button>
      </form>
      <form action={chooseLocale}>
        <input type="hidden" name="locale" value={current} />
        <input type="hidden" name="next" value="/" />
        <button type="submit">{format(copy["hint.stay"], { language })}</button>
      </form>
    </aside>
  );
}
