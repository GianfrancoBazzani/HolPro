export type Values = Record<string, string | number>;
export function format(template: string, values: Values = {}): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    if (Object.hasOwn(values, name)) return String(values[name]);
    const message = `Missing translation value: ${name}`;
    if (process.env.NODE_ENV === "test") throw new Error(message);
    console.warn(message);
    return placeholder;
  });
}
