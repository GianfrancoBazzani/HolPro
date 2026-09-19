"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="container" style={{ paddingBlock: "var(--section-y)" }}>
      <h1>Something went wrong.</h1>
      <p>Please try again in a moment.</p>
      <button className="button button-primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
