import {CoachHome} from "@/components/pro/coach-home";
import {pageLocale,type LocaleParams} from "@/lib/i18n/page";
export default async function Page({params,searchParams}:{params:LocaleParams;searchParams:Promise<Record<string,string|string[]|undefined>>}) {
 const [locale,query]=await Promise.all([pageLocale(params),searchParams]);
 return <CoachHome locale={locale} month={query.month} engagement={query.engagement} plan={query.plan}/>;
}
