import { requirePortalUser } from "@/lib/auth/gate";
import { portals } from "@/lib/auth/portals";
import { getDictionary, translator } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/config";
import { I18nProvider } from "@/components/i18n/provider";
import { Topbar } from "@/components/dashboard/topbar";
import { todayIn } from "@/lib/calendar/dates";
import { parseMonth, safeTimezone } from "@/lib/pro/dates";
import { loadClients, loadAgenda } from "@/lib/pro/repository";
import { Agenda } from "./agenda";
import { Clients } from "./clients";
import "@/components/dashboard/dashboard.css";
import "./pro.css";
export async function CoachHome({
  locale,
  month,
}: {
  locale: Locale;
  month?: unknown;
}) {
  const user = await requirePortalUser(portals.coach),
    timezone = safeTimezone(user.timezone);
  const [clients, data, messages] = await Promise.all([
    loadClients(user.id),
    loadAgenda(user.id, parseMonth(month, todayIn(timezone)), timezone),
    getDictionary(locale),
  ]);
  const t = translator(messages, "pro");
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
          locale={locale}
          messages={messages.dashboard}
          eyebrow={t("topbar.eyebrow")}
          name={user.name}
        />
        <div className="dashboard-layout">
          <div className="dashboard-main">
            <Agenda key={data.month} data={data} clients={clients} />
          </div>
          <Clients
            clients={clients}
            locale={locale}
            timezone={timezone}
            messages={messages.pro}
          />
        </div>
      </main>
    </I18nProvider>
  );
}
