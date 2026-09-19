import { emailTemplate, type TemplateParams } from "./base";
export const magicLink = (params: TemplateParams) =>
  emailTemplate(
    params,
    "Your sign-in link",
    "Sign in",
    "Your link expires in 5 minutes.",
  );
export const verifyEmail = (params: TemplateParams) =>
  emailTemplate(
    params,
    "Verify your email",
    "Verify email",
    "Confirm your email to start your next chapter.",
  );
export const resetPassword = (params: TemplateParams) =>
  emailTemplate(
    params,
    "Reset your password",
    "Reset password",
    "Your reset link expires in 15 minutes.",
  );
