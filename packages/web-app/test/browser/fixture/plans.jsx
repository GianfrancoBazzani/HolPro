import React, { useEffect, useState } from "react";
import { PlanArtifact } from "@/components/plans/plan-artifact";
import { PlanLive } from "@/components/plans/plan-live";
import { framePlanHtml } from "@/lib/plans/frame";
export function PlanFixture({ locale, messages }) {
  const [draftId, setDraftId] = useState("d1");
  useEffect(() => {
    window.replacePlanDraft = () => setDraftId("d2");
    return () => {
      delete window.replacePlanDraft;
    };
  }, []);
  const pending = new URLSearchParams(location.search).has("draft");
  const html = `<!-- <head>fake</head> --><script>window.ran=true;try{window.parent.document.body.dataset.escaped="yes";}catch{window.parentBlocked=true;}fetch("https://blocked.invalid/secret").then(()=>window.fetchBlocked=false).catch(()=>window.fetchBlocked=true);</script><meta http-equiv="refresh" content="0;url=https://blocked.invalid/"><h1>Coaching plan</h1><p>Focus every morning.</p>`;
  const view = {
    engagements: [
      { id: "e1", coachName: "Coach", coacheeName: "Alex", status: "active" },
      { id: "e2", coachName: "Coach", coacheeName: "Sam", status: "ended" },
    ],
    engagementId: "e1",
    plans: [
      {
        planId: "p1",
        engagementId: "e1",
        title: "Focus",
        versionNumber: 2,
        updatedAt: "2026-09-20T00:00:00Z",
      },
      {
        planId: "p2",
        engagementId: "e1",
        title: "Strength",
        versionNumber: 1,
        updatedAt: "2026-09-19T00:00:00Z",
      },
    ],
    selected: { planId: "p1", versionNumber: 2 },
    draft: pending
      ? {
          planId: "p1",
          draftId,
          title: "Focus",
          html,
          submittedAt: "2026-09-20T00:00:00Z",
        }
      : null,
    content: {
      kind: pending ? "draft" : "published",
      draftId,
      submittedAt: "2026-09-20T00:00:00Z",
      planId: "p1",
      title: "Focus",
      versionNumber: 2,
      publishedAt: "2026-09-20T00:00:00Z",
    },
    framed: framePlanHtml(html),
  };
  return (
    <>
      <PlanLive role="coach" />
      <PlanArtifact
        view={view}
        role="coach"
        locale={locale}
        timezone="Europe/Malta"
        messages={messages.dashboard}
        month="2026-09"
      />
    </>
  );
}
