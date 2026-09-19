import { Dashboard } from "@/components/dashboard/dashboard";
import { pageLocale, type LocaleParams } from "@/lib/i18n/page";
export default async function Page({ params }: { params: LocaleParams }) {
  return <Dashboard locale={await pageLocale(params)} />;
}
