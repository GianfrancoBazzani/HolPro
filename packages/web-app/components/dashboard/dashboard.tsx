import { loadPlanView } from "@/lib/plans/view";
import { PlanArtifact } from "@/components/plans/plan-artifact";
import { PlanLive } from "@/components/plans/plan-live";
import { requirePortalUser } from "@/lib/auth/gate";
import { portals } from "@/lib/auth/portals";
import { loadCalendar } from "@/lib/calendar/repository";
import { todayIn } from "@/lib/calendar/dates";
import { getDictionary, translator } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/config";
import { I18nProvider } from "@/components/i18n/provider";
import { Timeline } from "./timeline";
import { PlanOutline } from "./plan-outline";
import { Topbar } from "./topbar";
import { saveCalendarPreferences } from "@/lib/calendar/actions";
import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { isOnboarding } from "@/lib/assistant/onboarding";
import { safeTimezone } from "@/lib/pro/dates";
import "./dashboard.css";
export async function Dashboard({
  locale,
  plan,
}: {
  locale: Locale;
  plan?: unknown;
}) {
  const user = await requirePortalUser(portals.coachee);
  const [data, messages, documents] = await Promise.all([
    loadCalendar(user.id),
    getDictionary(locale),
    loadPlanView({ userId: user.id, role: "coachee" }, { plan }),
  ]);
  const t = translator(messages, "dashboard");
  return (
    <I18nProvider
      locale={locale}
      messages={{
        dashboard: messages.dashboard,
        settings: messages.settings,
        assistant: messages.assistant,
      }}
    >
      <main className="container dashboard">
        <PlanLive role="coachee" />
        <Topbar
          role="coachee"
          locale={locale}
          messages={messages.dashboard}
          eyebrow={t("topbar.eyebrow")}
          name={user.name}
        />
        <div className="dashboard-layout">
          <div className="dashboard-main">
            <PlanArtifact
              view={documents}
              role="coachee"
              locale={locale}
              timezone={user.timezone}
              messages={messages.dashboard}
            />
            <section
              className="dashboard-panel"
              aria-labelledby="calendar-heading"
            >
              <span className="eyebrow">{t("calendar.eyebrow")}</span>
              <h1 id="calendar-heading">{t("calendar.title")}</h1>
              <Timeline
                data={data}
                today={todayIn(user.timezone)}
                onSave={saveCalendarPreferences}
              />
            </section>
            <section className="dashboard-panel">
              <span className="eyebrow">{t("outline.eyebrow")}</span>
              <h2>{t("outline.title")}</h2>
              <PlanOutline items={data.items} engagements={data.engagements} />
            </section>
          </div>
          <AssistantPanel
            name={user.name}
            role="coachee"
            onboarding={isOnboarding(data, documents.plans.length > 0)}
            timezone={safeTimezone(user.timezone)}
          />
        </div>
      </main>
    </I18nProvider>
  );
}
