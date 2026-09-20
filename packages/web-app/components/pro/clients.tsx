import Image from "next/image";
import Link from "next/link";
import { translator, type Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/config";
import type { Client } from "@/lib/pro/types";
import { initials } from "@/lib/pro/names";
import logomark from "@/public/brand/logomark.png";
export function Clients({
  clients,
  locale,
  timezone,
  messages,
}: {
  clients: Client[];
  locale: Locale;
  timezone: string;
  messages: Dictionary["pro"];
}) {
  const t = translator({ pro: messages }, "pro"),
    collator = new Intl.Collator(locale),
    date = new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeZone: timezone,
    });
  return (
    <aside className="dashboard-panel clients-panel">
      <h2 className="eyebrow">{t("clients.eyebrow")}</h2>
      {!clients.length ? (
        <p>{t("clients.empty")}</p>
      ) : (
        <div className="clients-grid">
          {[...clients]
            .sort((a, b) => collator.compare(a.name, b.name))
            .map((client) => (
              <Link
                key={client.engagementId}
                href={`/pro/clients/${client.engagementId}`}
                className="client-card"
              >
                <span className="client-avatar">
                  {client.image ? (
                    <Image
                      src={client.image}
                      unoptimized
                      width={64}
                      height={64}
                      alt={t("clients.avatarAlt", { name: client.name })}
                    />
                  ) : (
                    <span aria-hidden="true">
                      {initials(client.name, locale) || (
                        <Image src={logomark} width={64} height={64} alt="" />
                      )}
                    </span>
                  )}
                </span>
                <strong>{client.name}</strong>
                <span>
                  {t("clients.since", {
                    date: date.format(new Date(client.startedAt)),
                  })}
                </span>
              </Link>
            ))}
        </div>
      )}
    </aside>
  );
}
