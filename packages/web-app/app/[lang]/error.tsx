"use client";
import { useT } from "@/components/i18n/provider";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const t = useT("common");
  return (
    <main className="container" style={{ paddingBlock: "var(--section-y)" }}>
      <h1>{t("error.title")}</h1>
      <p>{t("error.body")}</p>
      <button className="button button-primary" onClick={reset}>
        {t("error.retry")}
      </button>
    </main>
  );
}
