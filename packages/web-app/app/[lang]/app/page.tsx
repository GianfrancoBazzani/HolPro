import { Dashboard } from "@/components/dashboard/dashboard";
import { pageLocale, type LocaleParams } from "@/lib/i18n/page";
export default async function Page({ params, searchParams }: { params: LocaleParams; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <Dashboard locale={await pageLocale(params)} plan={(await searchParams).plan} />;
}
