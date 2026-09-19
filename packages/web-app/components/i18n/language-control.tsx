import { localeKeys, locales, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { chooseLocale } from "@/lib/i18n/actions";
export function LanguageControl({
  locale,
  messages,
  next,
}: {
  locale: Locale;
  messages: Dictionary["language"];
  next?: string;
}) {
  return (
    <nav className="language-control" aria-label={messages.label}>
      {localeKeys.map((key) =>
        key === locale ? (
          <span key={key} lang={key} aria-current="true">
            {locales[key].name}
          </span>
        ) : (
          <form key={key} action={chooseLocale}>
            <input type="hidden" name="locale" value={key} />
            {next !== undefined && (
              <input type="hidden" name="next" value={next} />
            )}
            <button lang={key} type="submit">
              {locales[key].name}
            </button>
          </form>
        ),
      )}
    </nav>
  );
}
