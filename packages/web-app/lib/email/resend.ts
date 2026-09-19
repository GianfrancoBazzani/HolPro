import { Resend } from "resend";
if (process.env.NODE_ENV === "production" && !process.env.RESEND_API_KEY)
  throw new Error("RESEND_API_KEY is required in production.");
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : undefined;
export async function sendEmail(message: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  if (!resend) {
    console.info(
      "[HolPro development email]",
      message.to,
      message.subject,
      message.text.match(/https?:\/\/\S+/g),
    );
    return;
  }
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "HolPro <hello@holpro.health>",
    ...message,
  });
  if (error) throw new Error(`Email delivery failed: ${error.name}`);
}
// Delivery errors must not reveal whether an account exists. Never log token URLs in production.
export async function deliverAuthEmail(
  message: Parameters<typeof sendEmail>[0],
) {
  try {
    await sendEmail(message);
  } catch (error) {
    console.error("Authentication email delivery failed.", error);
  }
}
