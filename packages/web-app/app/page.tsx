import Image from "next/image";
import wordmark from "../public/brand/wordmark.png";
import logomark from "../public/brand/logomark.png";
import session from "../public/brand/coach-session.jpg";
import mindfulness from "../public/brand/how-photo.webp";
import coach from "../public/brand/coach-photo.webp";
import pistachioStem from "../public/brand/pistachio-stem.jpg";
import cuminStem from "../public/brand/cumin-stem.jpg";

const navigation = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#coaches", label: "For coaches" },
];

const audiences = [
  {
    label: "For you",
    title: "Find the right coach, then keep going",
    body: "Matched to vetted coaches by goal. Your assistant agent turns the plan into daily steps and checks in.",
    surface: "orchid",
  },
  {
    label: "For coaches",
    title: "Help more people in the same hours",
    body: "Agentic infrastructure handles follow-ups, progress tracking and scheduling, so your time goes to coaching.",
    surface: "pistachio",
  },
  {
    label: "For teams",
    title: "One infrastructure for every coach",
    body: "Shared client plans, consistent methods and clear outcomes across sports, nutrition, mindset and habits.",
    surface: "pine",
  },
];

const steps = [
  {
    title: "Share your goal",
    body: "Tell us what you want to change. A race, a habit, your food, your focus. Any coach type, any level.",
  },
  {
    title: "Meet your coach",
    body: "We match you with a vetted coach who sets the plan with you in a first session.",
  },
  {
    title: "Your agent tracks the plan",
    body: "A personal assistant agent breaks the plan into daily steps, checks in and adjusts when life changes.",
  },
  {
    title: "Coach reviews, you progress",
    body: "Your coach sees the week in one view and spends the session on what matters, not on catching up.",
  },
];

const features = [
  {
    title: "Personal assistant agent",
    body: "Daily check-ins, reminders and logging that follow your coach’s plan.",
    color: "pistachio",
  },
  {
    title: "Coach matching",
    body: "Vetted coaches across disciplines, matched by goal, schedule and style.",
    color: "orchid",
  },
  {
    title: "One shared plan",
    body: "Coach and client see the same plan, progress and notes in real time.",
    color: "cumin",
  },
  {
    title: "Session prep",
    body: "The agent summarises the week so each session starts with context.",
    color: "parchment",
  },
  {
    title: "Adaptive scheduling",
    body: "Missed a day? The plan reshuffles without anyone chasing.",
    color: "pistachio",
  },
  {
    title: "Works for any discipline",
    body: "Sports, nutrition, mindset, habits and whatever comes next.",
    color: "orchid",
  },
];

const disciplines = [
  { label: "Sport", color: "pistachio" },
  { label: "Nutrition", color: "orchid" },
  { label: "Mindset", color: "cumin" },
  { label: "Habits", color: "parchment" },
];

export default function Home() {
  return (
    <>
      <a className="skip-link button button-primary" href="#main">
        Skip to content
      </a>
      <nav className="site-nav container" aria-label="Main navigation">
        <a className="brand-link" href="#" aria-label="HolPro home">
          <Image
            className="wordmark"
            src={wordmark}
            alt="HolPro"
            sizes="78px"
            preload
          />
        </a>
        <div className="nav-links">
          {navigation.map(({ href, label }) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
          <a className="button button-primary nav-button" href="#start">
            Start free
          </a>
        </div>
      </nav>

      <main id="main">
        <header className="hero container">
          <div className="hero-copy">
            <p className="eyebrow">Coaching, with an agent on your side</p>
            <h1>
              Unlock <em>yourself.</em>
            </h1>
            <p className="lead">
              Efficient access to the best coaches in sport, nutrition, mindset
              and habits. A personal assistant agent keeps your plan on track
              between sessions.
            </p>
            <div className="button-group">
              <a className="button button-primary" href="#start">
                Start free
              </a>
              <a className="button button-secondary" href="#how">
                See how it works
              </a>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-tile leaf fill-orchid">
              <Image
                src={session}
                alt=""
                fill
                sizes="(max-width: 940px) 45vw, 260px"
                preload
              />
            </div>
            <div className="hero-tile leaf-alt fill-pistachio mark-tile">
              <Image src={logomark} alt="" sizes="120px" />
            </div>
            <div className="hero-tile leaf-alt fill-cumin" />
            <div className="hero-tile leaf fill-pine">
              <span className="leaf-decor">
                <span className="leaf-cluster">
                  <span className="leaf" />
                  <span className="leaf-alt" />
                  <span className="leaf-alt" />
                  <span className="leaf" />
                </span>
              </span>
            </div>
          </div>
        </header>

        <section
          className="audiences container section"
          aria-labelledby="audiences-heading"
        >
          <div className="section-heading">
            <p className="eyebrow">Who it is for</p>
            <h2 id="audiences-heading">
              Built for the person, the coach and the team.
            </h2>
          </div>
          <div className="audience-grid">
            {audiences.map(({ label, title, body, surface }) => (
              <article
                className={`audience-card surface-${surface}`}
                key={label}
              >
                <p className="eyebrow">{label}</p>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="how"
          className="container section how-grid"
          aria-labelledby="how-heading"
        >
          <div className="how-intro">
            <p className="eyebrow">How it works</p>
            <h2 id="how-heading">
              A coach sets the direction. An agent keeps the pace.
            </h2>
            <div className="session-photo">
              <Image
                src={mindfulness}
                alt="A man practising mindfulness with his eyes closed and palms together"
                fill
                sizes="320px"
              />
            </div>
          </div>
          <ol className="steps">
            {steps.map(({ title, body }, index) => (
              <li key={title}>
                <span className="step-number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section
          id="features"
          className="surface-pine"
          aria-labelledby="features-heading"
        >
          <div className="container section-large features-content">
            <div className="features-heading">
              <div className="section-heading">
                <p className="eyebrow">Features</p>
                <h2 id="features-heading">
                  Everything between sessions, handled.
                </h2>
              </div>
              <ul className="legend" aria-label="Coaching disciplines">
                {disciplines.map(({ label, color }) => (
                  <li key={label}>
                    <span className={`dot fill-${color}`} aria-hidden="true" />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="features-grid">
              {features.map(({ title, body, color }) => (
                <article className="feature-card" key={title}>
                  <span
                    className={`feature-leaf leaf fill-${color}`}
                    aria-hidden="true"
                  />
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="coaches"
          className="container section-large coaches-grid"
          aria-labelledby="coaches-heading"
        >
          <div className="coach-art">
            <Image
              className="decoration"
              src={pistachioStem}
              alt=""
              fill
              sizes="(max-width: 900px) 90vw, 520px"
            />
            <div className="coach-portrait leaf">
              <Image
                src={coach}
                alt="A coach working at a laptop"
                fill
                sizes="(max-width: 900px) 50vw, 290px"
              />
            </div>
          </div>
          <div className="coach-copy">
            <p className="eyebrow">For coaches and teams</p>
            <h2 id="coaches-heading">
              Leverage, without losing the personal touch.
            </h2>
            <p>
              Freelancers and teams get an agentic infrastructure that follows
              up, tracks progress and prepares each session. You stay the coach.
              The agent does the admin.
            </p>
            <ul className="checklist">
              <li>
                <span className="dot fill-cumin" aria-hidden="true" />
                Onboard clients in minutes, not weeks
              </li>
              <li>
                <span className="dot fill-pistachio" aria-hidden="true" />
                See every client&apos;s week at a glance
              </li>
              <li>
                <span className="dot fill-orchid" aria-hidden="true" />
                Your methods, applied consistently by the agent
              </li>
            </ul>
            <a className="button button-secondary" href="#start">
              Set up your practice
            </a>
          </div>
        </section>

        <section id="start" className="cta" aria-labelledby="start-heading">
          <Image
            className="cta-pattern decoration"
            src={cuminStem}
            alt=""
            sizes="(max-width: 600px) 100vw, 700px"
          />
          <div className="container cta-content">
            <h2 id="start-heading">Ready to unlock yourself?</h2>
            <p className="cta-lead">
              Pick a goal, meet your coach and get started.
            </p>
            <div className="signup-preview">
              <form
                className="signup-form"
                aria-label="Signup preview"
                aria-describedby="signup-note"
              >
                <label className="sr-only" htmlFor="signup-email">
                  Email address
                </label>
                <input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  disabled
                />
                <button
                  className="button button-primary"
                  type="submit"
                  disabled
                >
                  Start free
                </button>
              </form>
              <p id="signup-note">Signups are not open yet. Check back soon.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer container">
        <a className="brand-link" href="#" aria-label="HolPro home">
          <Image
            className="wordmark"
            src={wordmark}
            alt="HolPro"
            sizes="60px"
          />
        </a>
        <nav aria-label="Footer navigation">
          {navigation.map(({ href, label }) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>
        <span className="copyright">© 2026 holpro</span>
      </footer>
    </>
  );
}
