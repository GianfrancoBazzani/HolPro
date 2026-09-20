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
import { loadPlanView } from "@/lib/plans/view";
import { PlanArtifact } from "@/components/plans/plan-artifact";
import { PlanLive } from "@/components/plans/plan-live";
import { AssistantPanel } from "@/components/assistant/assistant-panel";
export async function ClientPanel({
  locale,
  engagementId,
  plan,
  preview,
}: {
  locale: Locale;
  engagementId: string;
  plan?: unknown;
  preview?: unknown;
}) {
  const user = await requirePortalUser(portals.coach);
  const [data, messages] = await Promise.all([
    loadClientPlan(user.id, engagementId, { includeEnded: true }),
    getDictionary(locale),
  ]);
  if (!data) notFound();
  const documents = await loadPlanView(
    { userId: user.id, role: "coach" },
    { engagement: engagementId, plan, preview },
  );
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
        assistant: messages.assistant,
      }}
    >
      <main className="container dashboard coach-dashboard">
        <PlanLive role="coach" />
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
        <div className="dashboard-layout">
          <div className="dashboard-main">
            <PlanArtifact
              view={documents}
              role="coach"
              locale={locale}
              timezone={timezone}
              messages={messages.dashboard}
              editable={data.status === "active"}
            />
            <section className="dashboard-panel">
              <span className="eyebrow">{d("calendar.eyebrow")}</span>
              <h2>{t("client.calendarTitle")}</h2>
              <Timeline
                key={engagementId}
                data={data.calendar}
                today={todayIn(timezone)}
              />
            </section>
            {data.status === "active" && (
              <section className="dashboard-panel">
                <span className="eyebrow">{d("outline.eyebrow")}</span>
                <h2>{t("client.planTitle")}</h2>
                <PlanEditor
                  engagementId={engagementId}
                  items={data.calendar.items}
                  engagements={data.calendar.engagements}
                />
              </section>
            )}
          </div>
          <div className="assistant-sidebar">
            <AssistantPanel
              key={engagementId}
              name={user.name}
              role="coach"
              onboarding={false}
              timezone={timezone}
              engagementId={engagementId}
              planId={documents.selected?.planId}
            />
          </div>
        </div>
      </main>
    </I18nProvider>
  );
}
