"use client";
import { useT } from "@/components/i18n/provider";
export function ChatPanel(_props: { engagementId?: string }) {
  void _props;
  const t = useT("dashboard");
  return (
    <aside className="dashboard-panel dashboard-chat">
      <span className="eyebrow">{t("chat.eyebrow")}</span>
      <h2>{t("chat.title")}</h2>
      <p>{t("chat.body")}</p>
    </aside>
  );
}
