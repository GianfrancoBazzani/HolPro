// Run against a local production server: node scripts/check-i18n-http.mjs http://localhost:3101
import assert from "node:assert/strict";
const base = process.argv[2] ?? "http://localhost:3000";
for (const [path, language] of [
  ["/", "en"],
  ["/es", "es"],
  ["/it", "it"],
  ["/login", "es"],
]) {
  const response = await fetch(new URL(path, base), {
    headers: { cookie: "hp_locale=es" },
  });
  assert.equal(response.status, 200, path);
  assert.match(
    await response.text(),
    new RegExp(`<html[^>]*lang="${language}"`),
    path,
  );
}
for (const [path, destination] of [
  ["/en?x=1", "/?x=1"],
  ["/es/login?token=x", "/login?token=x"],
  ["/it/login?token=x", "/login?token=x"],
]) {
  const response = await fetch(new URL(path, base), { redirect: "manual" });
  assert.equal(response.status, 308, path);
  assert.equal(
    new URL(response.headers.get("location"), base).href,
    new URL(destination, base).href,
  );
}
for (const [locale, title] of [
  ["en", "Page not found."],
  ["es", "Página no encontrada."],
  ["it", "Pagina non trovata."],
]) {
  const response = await fetch(new URL("/unknown-page", base), {
    headers: { cookie: `hp_locale=${locale}` },
  });
  assert.equal(response.status, 404);
  const html = await response.text();
  assert.match(html, new RegExp(`<html[^>]*lang="${locale}"`));
  assert.ok(
    html.includes(`<h1>${title}</h1>`),
    "404 copy must be in initial HTML, without JavaScript",
  );
}
// Submit the server-rendered language form without a browser/JavaScript runtime.
const login = await fetch(new URL("/login", base), {
  headers: { cookie: "hp_locale=en" },
});
const markup = await login.text();
const control = markup.match(
  /<nav[^>]*aria-label="Language"[\s\S]*?<\/nav>/,
)?.[0];
assert.ok(control, "English login exposes a language control");
const action = control.match(/name="(\$ACTION_ID_[^"]+)"/);
assert.ok(
  action,
  "Language control has a progressive-enhancement server action",
);
const form = new FormData();
form.set(action[1], "");
form.set("locale", "es");
const choice = await fetch(new URL("/login", base), {
  method: "POST",
  body: form,
  redirect: "manual",
  headers: {
    origin: new URL(base).origin,
    referer: new URL("/login?error=link_invalid", base).href,
  },
});
assert.equal(choice.status, 303);
assert.equal(new URL(choice.headers.get("location"), base).pathname, "/login");
assert.equal(
  new URL(choice.headers.get("location"), base).search,
  "?error=link_invalid",
);
assert.ok(
  choice.headers
    .getSetCookie()
    .some((cookie) => cookie.startsWith("hp_locale=es;")),
);
console.log(
  "i18n HTTP checks passed: marketing, product language, redirects, server-rendered 404s, and language choice without JavaScript.",
);
