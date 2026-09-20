import { ClientPanel } from "@/components/pro/client-panel";
import { pageLocale } from "@/lib/i18n/page";
export default async function Page({ params, searchParams }: {
  params: Promise<{ lang: string; engagementId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [locale, { engagementId }, query] = await Promise.all([
    pageLocale(params), params, searchParams,
  ]);
  return (
    <ClientPanel
      locale={locale}
      engagementId={engagementId}
      plan={query.plan}
      preview={query.preview}
    />
  );
}
