import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { translator } from "@/lib/i18n/dictionary";
import { localePath } from "@/lib/i18n/routes";
import { AccountControls } from "@/components/account/account-controls";
import wordmark from "@/public/brand/wordmark.png";
export function Topbar({
  locale,
  messages,
  eyebrow,
  name,
  back,
}: {
  locale: Locale;
  messages: Dictionary["dashboard"];
  eyebrow: string;
  name: string;
  back?: { href: string; label: string };
}) {
  const t = translator({ dashboard: messages }, "dashboard");
  return (
    <header className="dashboard-topbar">
      <Link href={localePath(locale, "/")}>
        <Image
          className="dashboard-wordmark"
          src={wordmark}
          alt={t("topbar.wordmarkAlt")}
          priority
        />
      </Link>
      {back && (
        <Link className="calendar-chip" href={back.href}>
          {back.label}
        </Link>
      )}
      <div className="dashboard-identity">
        <span className="eyebrow">{eyebrow}</span>
        <span>{name}</span>
      </div>
      <AccountControls />
    </header>
  );
}
