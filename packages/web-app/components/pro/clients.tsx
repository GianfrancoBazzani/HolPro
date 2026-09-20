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
  messages,
}: {
  clients: Client[];
  locale: Locale;
  messages: Dictionary["pro"];
}) {
  const t = translator({ pro: messages }, "pro"),
    collator = new Intl.Collator(locale);
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
                      width={40}
                      height={40}
                      alt={t("clients.avatarAlt", { name: client.name })}
                    />
                  ) : (
                    <span aria-hidden="true">
                      {initials(client.name, locale) || (
                        <Image src={logomark} width={40} height={40} alt="" />
                      )}
                    </span>
                  )}
                </span>
                <strong>{client.name}</strong>
              </Link>
            ))}
        </div>
      )}
    </aside>
  );
}
