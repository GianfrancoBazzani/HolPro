import Image from "next/image";
import Link from "next/link";
import { requirePortalUser } from "@/lib/auth/gate";
import { portals } from "@/lib/auth/portals";
import { loadCalendar } from "@/lib/calendar/repository";
import { todayIn } from "@/lib/calendar/dates";
import { getDictionary, translator } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/routes";
import { I18nProvider } from "@/components/i18n/provider";
import { AccountControls } from "@/components/account/account-controls";
import { Timeline } from "./timeline";
import { PlanArtifact } from "./plan-artifact";
import { ChatPanel } from "./chat-panel";
import wordmark from "@/public/brand/wordmark.png";
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
        <header className="dashboard-topbar">
          <Link href={localePath(locale, "/")}>
            <Image
              className="dashboard-wordmark"
              src={wordmark}
              alt={t("topbar.wordmarkAlt")}
              priority
            />
          </Link>
          <div className="dashboard-identity">
            <span className="eyebrow">{t("topbar.eyebrow")}</span>
            <span>{user.name}</span>
          </div>
          <AccountControls />
        </header>
        <div className="dashboard-layout">
          <div className="dashboard-main">
            <section
              className="dashboard-panel"
              aria-labelledby="calendar-heading"
            >
              <span className="eyebrow">{t("calendar.eyebrow")}</span>
              <h1 id="calendar-heading">{t("calendar.title")}</h1>
              <Timeline data={data} today={todayIn(user.timezone)} />
            </section>
            <PlanArtifact engagementId={engagementId} />
          </div>
          <ChatPanel engagementId={engagementId} />
        </div>
      </main>
    </I18nProvider>
  );
}
