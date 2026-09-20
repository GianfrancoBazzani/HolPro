import React from "react";
import { TelegramFixture } from "./telegram";
import { PlanFixture } from "./plans";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "@/components/i18n/provider";
import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { Agenda } from "@/components/pro/agenda";
import { PlanEditor } from "@/components/pro/plan-editor";
import { monthGrid } from "@/lib/pro/dates";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import it from "@/messages/it.json";
import "@/app/[lang]/globals.css";
import "@/components/dashboard/dashboard.css";
import "@/components/pro/pro.css";
const query = new URLSearchParams(location.search);
const locale = query.get("locale") || "en";
const messages = { en, es, it }[locale];
document.documentElement.lang = locale;
document.documentElement.style.setProperty("--font-manrope", "system-ui");
document.documentElement.style.setProperty(
  "--font-instrument-serif",
  "Georgia",
);
const id = "11111111-1111-4111-8111-111111111111";
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <I18nProvider locale={locale} messages={messages}>
      <main className="container dashboard coach-dashboard">
        {query.has("telegram") ? (
          <TelegramFixture />
        ) : query.has("plans") ? (
          <PlanFixture locale={locale} messages={messages} />
        ) : query.has("assistant") ? (
          <div className="dashboard-layout">
            <div className="dashboard-main">
              <h1>{messages.dashboard["calendar.title"]}</h1>
            </div>
            <AssistantPanel
              name="Alex"
              role="coachee"
              onboarding={true}
              timezone="Europe/Rome"
            />
          </div>
        ) : (
          <>
            <Agenda
              data={{
                month: "2026-09",
                today: "2026-09-19",
                timezone: "Europe/Rome",
                weeks: monthGrid("2026-09"),
                events: {
                  "2026-09-19": [
                    {
                      id,
                      kind: "call",
                      title: "Planning session",
                      startsAt: "2026-09-19T13:00:00Z",
                      durationMinutes: 60,
                      note: "Original note",
                      engagementId: null,
                      clientName: null,
                    },
                  ],
                },
              }}
              clients={[]}
            />
            <section className="dashboard-panel">
              <PlanEditor
                engagementId={id}
                engagements={[{ id, coachName: "Coach" }]}
                items={[
                  {
                    id,
                    engagementId: id,
                    kind: "training",
                    title: "Strength and steady progress",
                    createdAt: "2026-09-19",
                    description: "A thoughtful plan for the coming weeks.",
                    checkpoints: [],
                    periods: [],
                  },
                ]}
              />
            </section>
          </>
        )}
      </main>
    </I18nProvider>
  </React.StrictMode>,
);
