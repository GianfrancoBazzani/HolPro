"use client";
import { useT } from "@/components/i18n/provider";
export function PlanArtifact(_props: { engagementId?: string }) {
  void _props;
  const t = useT("dashboard");
  return (
    <section className="dashboard-panel">
      <span className="eyebrow">{t("artifact.eyebrow")}</span>
      <h2>{t("artifact.title")}</h2>
      <p>{t("artifact.body")}</p>
    </section>
  );
}
