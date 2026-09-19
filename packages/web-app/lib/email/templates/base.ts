import { baseURL, type Portal } from "../../auth/portals";
export type TemplateParams = { url: string; portal: Portal };
function escape(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}
export function emailTemplate(
  { url, portal }: TemplateParams,
  subject: string,
  button: string,
  message: string,
) {
  return {
    subject,
    text: `${portal.label}\n${message}\n${button}: ${url}\nIf you did not request this, ignore this email.`,
    html: `<!doctype html><html><body style="margin:0;background:#F5F4EF;color:#1D4533;font-family:Manrope,system-ui,sans-serif"><div style="max-width:520px;padding:32px;margin:auto"><img src="${escape(baseURL)}/brand/wordmark.png" alt="HolPro" height="34"><p>${portal.label}</p><h1 style="font-family:Georgia,serif;font-weight:400">${subject}</h1><p>${message}</p><p><a href="${escape(url)}" style="display:inline-block;background:#1D4533;color:#F5F4EF;border-radius:999px;padding:16px 28px;text-decoration:none">${button}</a></p><p style="overflow-wrap:anywhere">${escape(url)}</p><p>If you did not request this, ignore this email.</p></div></body></html>`,
  };
}
