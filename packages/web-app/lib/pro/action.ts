import { refresh } from "next/cache";
import { requirePortalUser } from "@/lib/auth/gate";
import { portals } from "@/lib/auth/portals";
import { currentLocale } from "@/lib/i18n/request";
import {
  getDictionary,
  translator,
  type Translator,
} from "@/lib/i18n/dictionary";
import type { ProActionState } from "./types";
export async function coachContext() {
  const user = await requirePortalUser(portals.coach);
  const dictionary = await getDictionary(await currentLocale());
  return { user, dictionary, t: translator(dictionary, "pro") };
}
export async function attempt(
  t: Translator<"pro">,
  owned: () => Promise<boolean>,
  write: () => Promise<unknown>,
): Promise<ProActionState> {
  try {
    if (!(await owned())) return { ok: false, error: t("error.notFound") };
    await write();
  } catch {
    return { ok: false, error: t("error.generic") };
  }
  refresh();
  return { ok: true };
}
