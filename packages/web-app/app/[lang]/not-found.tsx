"use client";
import Link from "next/link";
import { useLocale, useT } from "@/components/i18n/provider";
import { localePath } from "@/lib/i18n/routes";
export default function NotFound() {
  const locale = useLocale();
  const t = useT("common");
  return (
    <main className="container" style={{ paddingBlock: "var(--section-y)" }}>
      <h1>{t("notFound.title")}</h1>
      <p>{t("notFound.body")}</p>
      <Link className="button button-primary" href={localePath(locale, "/")}>
        {t("notFound.home")}
      </Link>
    </main>
  );
}
