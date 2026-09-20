import { SkillsPage } from "@/components/pro/skills-page";
import { pageLocale, type LocaleParams } from "@/lib/i18n/page";
export default async function Page({ params }: { params: LocaleParams }) {
  return <SkillsPage locale={await pageLocale(params)} />;
}
