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
// Brand tokens, flattened to solid hex. Email clients drop rgba() and CSS variables.
const parchment = "#F5F4EF";
const pine = "#1D4533";
const cumin = "#CA6728";
const hairline = "#CED5CD"; // Pine at 18% over Parchment
const muted = "#5E7A6B"; // Pine at 70% over Parchment
const serif = "'Instrument Serif',Georgia,serif";
const sans = "Manrope,system-ui,-apple-system,'Segoe UI',Arial,sans-serif";
const spacer = (height: number) =>
  `<tr><td style="height:${height}px;line-height:${height}px;font-size:0">&nbsp;</td></tr>`;
const rule = `<tr><td style="height:1px;line-height:1px;font-size:0;background:${hairline}">&nbsp;</td></tr>`;
export function emailTemplate(
  { url, portal }: TemplateParams,
  subject: string,
  button: string,
  message: string,
) {
  const href = escape(url);
  return {
    subject,
    text: `${portal.label}\n\n${subject}\n${message}\n\n${button}: ${url}\n\nIf you did not request this, ignore this email.\n\nHolPro — Unlock yourself.`,
    html: `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${escape(subject)}</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<style>
  :root { color-scheme: light only; supported-color-schemes: light only; }
  body { margin:0; padding:0; width:100% !important; -webkit-font-smoothing:antialiased; }
  a { text-decoration:none; }
  @media (max-width:600px) {
    .gutter { padding-left:24px !important; padding-right:24px !important; }
    .display { font-size:34px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${parchment};color:${pine};font-family:${sans}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${escape(message)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${parchment}">
<tr><td align="center" class="gutter" style="padding:40px 32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;text-align:left">
<tr><td><img src="${escape(baseURL)}/brand/wordmark.png" alt="HolPro" height="34" style="display:block;height:34px;width:auto;border:0"></td></tr>
${spacer(36)}
<tr><td style="font-family:${sans};font-size:14px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:${cumin}">${escape(portal.label)}</td></tr>
${spacer(12)}
<tr><td class="display" style="font-family:${serif};font-weight:400;font-size:42px;line-height:1.05;letter-spacing:-.01em;color:${pine}">${escape(subject)}</td></tr>
${spacer(16)}
<tr><td style="font-family:${sans};font-size:17px;line-height:1.6;color:${pine}">${escape(message)}</td></tr>
${spacer(28)}
<tr><td>
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:52px;v-text-anchor:middle;width:220px" arcsize="50%" stroke="f" fillcolor="${pine}"><w:anchorlock/><center style="color:${parchment};font-family:Arial,sans-serif;font-size:16px;font-weight:600"><![endif]-->
<a href="${href}" style="display:inline-block;background:${pine};color:${parchment};font-family:${sans};font-size:16px;font-weight:600;line-height:20px;padding:16px 28px;border-radius:999px;mso-padding-alt:0;text-decoration:none">${escape(button)}</a>
<!--[if mso]></center></v:roundrect><![endif]-->
</td></tr>
${spacer(32)}
${rule}
${spacer(20)}
<tr><td style="font-family:${sans};font-size:13px;line-height:1.5;color:${muted}">If the button does not work, copy this link into your browser.</td></tr>
${spacer(8)}
<tr><td style="font-family:${sans};font-size:13px;line-height:1.5;color:${pine};overflow-wrap:anywhere;word-break:break-word"><a href="${href}" style="color:${pine};text-decoration:none">${href}</a></td></tr>
${spacer(20)}
${rule}
${spacer(20)}
<tr><td style="font-family:${sans};font-size:13px;line-height:1.5;color:${muted}">If you did not request this, ignore this email.</td></tr>
${spacer(8)}
<tr><td style="font-family:${sans};font-size:13px;line-height:1.5;color:${muted}">HolPro &mdash; Unlock yourself.</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  };
}
