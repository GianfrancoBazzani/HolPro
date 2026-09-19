export function initials(name: string, locale: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => [...word][0].toLocaleUpperCase(locale))
    .join("");
}
