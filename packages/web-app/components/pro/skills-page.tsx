import { requirePortalUser } from "@/lib/auth/gate";
import { portals } from "@/lib/auth/portals";
import { getDictionary, translator } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/config";
import { I18nProvider } from "@/components/i18n/provider";
import { Topbar } from "@/components/dashboard/topbar";
import { coachProfile } from "@/lib/pro/profile";
import { safeTimezone } from "@/lib/pro/dates";
import { listCoachSkills } from "@/lib/pro/skills-repository";
import { SkillsManager } from "./skills-manager";
import "@/components/dashboard/dashboard.css";
import "./pro.css";
export async function SkillsPage({ locale }: { locale: Locale }) {
  const user = await requirePortalUser(portals.coach);
  const [skills, messages] = await Promise.all([
    listCoachSkills(user.id),
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
          links={[{ href: "/pro", label: t("topbar.back") }]}
          profile={coachProfile(user)}
        />
        <div className="dashboard-main">
          <section className="dashboard-panel">
            <span className="eyebrow">{t("skills.eyebrow")}</span>
            <h1>{t("skills.title")}</h1>
            <p className="skills-intro">{t("skills.intro")}</p>
            <SkillsManager
              skills={skills}
              timezone={safeTimezone(user.timezone)}
            />
          </section>
        </div>
      </main>
    </I18nProvider>
  );
}
