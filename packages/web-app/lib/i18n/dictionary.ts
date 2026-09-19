import en from "@/messages/en.json";
import { type Locale } from "./config";
import { format, type Values } from "./format";
export type Dictionary = typeof en;
export type Namespace = keyof Dictionary;
export type Translator<N extends Namespace> = (
  key: keyof Dictionary[N],
  values?: Values,
) => string;
// The locale union comes from config; the bundler discovers the JSON modules.
// Parity tests validate every configured locale against the English shape.
export async function getDictionary(locale: Locale): Promise<Dictionary> {
  if (locale === "en") return en;
  return (await import(`../../messages/${locale}.json`)).default;
}
export function translator<N extends Namespace>(
  dictionary: Pick<Dictionary, N>,
  namespace: N,
): Translator<N> {
  const messages = dictionary[namespace];
  return (key, values) => format(messages[key] as string, values);
}
export async function getTranslator<N extends Namespace>(
  locale: Locale,
  namespace: N,
): Promise<Translator<N>> {
  return translator(await getDictionary(locale), namespace);
}
