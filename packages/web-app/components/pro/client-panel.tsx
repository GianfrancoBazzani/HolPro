import { notFound } from "next/navigation";
import { requirePortalUser } from "@/lib/auth/gate";
import { portals } from "@/lib/auth/portals";
import { getDictionary, translator } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/config";
import { I18nProvider } from "@/components/i18n/provider";
import { Topbar } from "@/components/dashboard/topbar";
import { coachProfile } from "@/lib/pro/profile";
import { Timeline } from "@/components/dashboard/timeline";
import { todayIn } from "@/lib/calendar/dates";
import { safeTimezone } from "@/lib/pro/dates";
import { loadClientPlan } from "@/lib/pro/repository";
import { PlanEditor } from "./plan-editor";
import "@/components/dashboard/dashboard.css";
import "./pro.css";
import { coachEngagementHref } from "@/lib/notifications/links";
export async function ClientPanel({
  locale,
  engagementId,
}: {
  locale: Locale;
  engagementId: string;
}) {
  const user = await requirePortalUser(portals.coach);
  const [data, messages] = await Promise.all([
    loadClientPlan(user.id, engagementId),
    getDictionary(locale),
  ]);
  if (!data) notFound();
  const t = translator(messages, "pro"),
    d = translator(messages, "dashboard"),
    timezone = safeTimezone(user.timezone);
  const since = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: timezone,
  }).format(new Date(data.client.startedAt));
  return (
    <I18nProvider
      locale={locale}
      messages={{
        dashboard: messages.dashboard,
        settings: messages.settings,
        pro: messages.pro,
      }}
    >
      <main className="container dashboard coach-dashboard">
        <Topbar
          role="coach"
          locale={locale}
          messages={messages.dashboard}
          eyebrow={t("topbar.eyebrow")}
          name={user.name}
          profile={coachProfile(user)}
          links={[{ href: "/pro", label: t("topbar.back") }]}
        />
        <header className="client-heading">
          <span className="eyebrow">{t("client.eyebrow")}</span>
          <h1>{data.client.name}</h1>
          <div>
            <span>{data.client.email}</span>
            <span>{t("clients.since", { date: since })}</span>
          </div>
        </header>
        <a
          className="button button-secondary"
          href={coachEngagementHref(engagementId)}
        >
          {t("client.reviewPlans")}
        </a>
        <div className="dashboard-main">
          <section className="dashboard-panel">
            <span className="eyebrow">{d("calendar.eyebrow")}</span>
            <h2>{t("client.calendarTitle")}</h2>
            <Timeline
              key={engagementId}
              data={data.calendar}
              today={todayIn(timezone)}
            />
          </section>
          <section className="dashboard-panel">
            <span className="eyebrow">{d("outline.eyebrow")}</span>
            <h2>{t("client.planTitle")}</h2>
            <PlanEditor
              engagementId={engagementId}
              items={data.calendar.items}
              engagements={data.calendar.engagements}
            />
          </section>
        </div>
      </main>
    </I18nProvider>
  );
}
