"use client";
import { serif, sans } from "@/lib/i18n/fonts";
import "./[lang]/globals.css";
/* eslint-disable react/jsx-no-literals -- Emergency English fallback must work without dictionaries or providers. */
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en" dir="ltr" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <main
          className="container"
          style={{ paddingBlock: "var(--section-y)" }}
        >
          <h1>Something went wrong.</h1>
          <p>Please try again in a moment.</p>
          <button className="button button-primary" onClick={reset}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
