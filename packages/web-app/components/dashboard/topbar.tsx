import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { translator } from "@/lib/i18n/dictionary";
import { localePath } from "@/lib/i18n/routes";
import { AccountControls } from "@/components/account/account-controls";
import type { CoachProfile } from "@/lib/pro/types";
import wordmark from "@/public/brand/wordmark.png";
import type { PortalKey } from "@/lib/auth/portals";
export function Topbar({
  role,
  locale,
  messages,
  eyebrow,
  name,
  links = [],
  profile,
}: {
  role: PortalKey;
  locale: Locale;
  messages: Dictionary["dashboard"];
  eyebrow: string;
  name: string;
  links?: { href: string; label: string }[];
  profile?: CoachProfile;
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
      {links.map((link) => (
        <Link key={link.href} className="calendar-chip" href={link.href}>
          {link.label}
        </Link>
      ))}
      <div className="dashboard-identity">
        <span className="eyebrow">{eyebrow}</span>
        <span>{name}</span>
      </div>
      <AccountControls profile={profile} role={role} />
    </header>
  );
}
