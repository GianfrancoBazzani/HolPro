import { loadPlanView } from "@/lib/plans/view";
import { PlanArtifact } from "@/components/plans/plan-artifact";
import { PlanLive } from "@/components/plans/plan-live";
import { requirePortalUser } from "@/lib/auth/gate";
import { portals } from "@/lib/auth/portals";
import { getDictionary, translator } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/config";
import { I18nProvider } from "@/components/i18n/provider";
import { Topbar } from "@/components/dashboard/topbar";
import { coachProfile } from "@/lib/pro/profile";
import { todayIn } from "@/lib/calendar/dates";
import { parseMonth, safeTimezone } from "@/lib/pro/dates";
import { loadClients, loadAgenda } from "@/lib/pro/repository";
import { Agenda } from "./agenda";
import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { Clients } from "./clients";
import "@/components/dashboard/dashboard.css";
import "./pro.css";
export async function CoachHome({
  locale,
  month,
  engagement,
  plan,
}: {
  locale: Locale;
  month?: unknown;
  engagement?: unknown;
  plan?: unknown;
}) {
  const user = await requirePortalUser(portals.coach),
    timezone = safeTimezone(user.timezone);
  const [clients, data, messages, documents] = await Promise.all([
    loadClients(user.id),
    loadAgenda(user.id, parseMonth(month, todayIn(timezone)), timezone),
    getDictionary(locale),
    loadPlanView({ userId: user.id, role: "coach" }, { engagement, plan }),
  ]);
  const t = translator(messages, "pro");
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
          links={[{ href: "/pro/skills", label: t("skills.link") }]}
        />
        <div className="dashboard-layout">
          <div className="dashboard-main">
            <Agenda
              key={data.month}
              data={data}
              clients={clients}
              selection={{
                engagement: documents.engagementId,
                plan: documents.selected?.planId,
              }}
            />
            <PlanArtifact
              view={documents}
              role="coach"
              locale={locale}
              timezone={timezone}
              messages={messages.dashboard}
              month={data.month}
            />
          </div>
          <div className="assistant-sidebar">
            <Clients
              clients={clients}
              locale={locale}
              timezone={timezone}
              messages={messages.pro}
            />
            <AssistantPanel name={user.name} role="coach" onboarding={false} />
          </div>
        </div>
      </main>
    </I18nProvider>
  );
}
