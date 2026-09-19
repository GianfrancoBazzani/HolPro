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
import { ChatPanel } from "./chat-panel";
import "./dashboard.css";
export async function Dashboard({ locale }: { locale: Locale }) {
  const user = await requirePortalUser(portals.coachee);
  const [data, messages] = await Promise.all([
    loadCalendar(user.id),
    getDictionary(locale),
  ]);
  const t = translator(messages, "dashboard");
  const engagementId = data.engagements[0]?.id;
  return (
    <I18nProvider
      locale={locale}
      messages={{ dashboard: messages.dashboard, settings: messages.settings }}
    >
      <main className="container dashboard">
        <Topbar
          locale={locale}
          messages={messages.dashboard}
          eyebrow={t("topbar.eyebrow")}
          name={user.name}
        />
        <div className="dashboard-layout">
          <div className="dashboard-main">
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
          <ChatPanel engagementId={engagementId} />
        </div>
      </main>
    </I18nProvider>
  );
}
