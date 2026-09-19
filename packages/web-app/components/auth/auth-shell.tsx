import Image from "next/image";
import Link from "next/link";
import type { Portal } from "@/lib/auth/portals";
import wordmark from "@/public/brand/wordmark-parchment.png";
import pineStem from "@/public/brand/pine-stem.jpg";
import "./auth.css";
export function AuthShell({
  portal,
  children,
}: {
  portal: Portal;
  children: React.ReactNode;
}) {
  return (
    <main className="auth-shell container">
      <section
        className={`auth-brand auth-brand-${portal.key}`}
        aria-label="HolPro"
      >
        <Image
          className="auth-pattern"
          src={pineStem}
          alt=""
          fill
          sizes="(max-width: 900px) 100vw, 50vw"
          priority
        />
        <Link href="/" className="auth-wordmark">
          <Image src={wordmark} alt="HolPro home" className="auth-wordmark-img" />
        </Link>
        <div className="auth-brand-copy">
          <span className="auth-leaf" aria-hidden="true" />
          <p>{portal.heading}</p>
          <span>Unlock yourself.</span>
        </div>
      </section>
      <section className="auth-content">
        <span className="eyebrow">{portal.label}</span>
        {children}
      </section>
    </main>
  );
}
