import { emailTemplate, type TemplateParams } from "./base";
export const magicLink = (params: TemplateParams) =>
  emailTemplate(params, "magic");
export const verifyEmail = (params: TemplateParams) =>
  emailTemplate(params, "verify");
export const resetPassword = (params: TemplateParams) =>
  emailTemplate(params, "reset");
