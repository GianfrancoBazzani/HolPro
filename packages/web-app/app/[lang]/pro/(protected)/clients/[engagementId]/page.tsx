import {ClientPanel} from "@/components/pro/client-panel";
import {pageLocale} from "@/lib/i18n/page";
export default async function Page({params}:{params:Promise<{lang:string;engagementId:string}>}) {
 const [locale,{engagementId}]=await Promise.all([pageLocale(params),params]);
 return <ClientPanel locale={locale} engagementId={engagementId}/>;
}
