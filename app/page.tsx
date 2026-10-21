import type { Metadata } from "next";
import Link from "next/link";
import { AureaLogo } from "@/components/aurea-logo";
import { LandingCta } from "@/components/landing-cta";
import { SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Aurea — a calmer planner for your day" },
  description: "Plan your day, keep projects moving and build routines in one calm planner that syncs between your phone and laptop. Free, no ads.",
  openGraph: {
    title: "Aurea — a calmer planner for your day",
    description: "Today, projects, routines and reminders in one calm planner. Free, no ads, syncs between your devices.",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "Aurea" }],
    type: "website",
  },
};

const features = [
  { icon: "☀︎", title: "A clear view of today", text: "Unscheduled tasks on one side, your timeline on the other. Drag a task onto a time and your day takes shape." },
  { icon: "▱", title: "Projects that move", text: "A simple To do, In progress, Done board for each project, with checklists and progress updates." },
  { icon: "↻", title: "Routines that stick", text: "Morning routines, workouts, habits — with checklists and streaks that keep you going." },
  { icon: "🔔", title: "Reminders that arrive", text: "As many reminders as you need — minutes, hours, days or a week before — even when Aurea is closed." },
  { icon: "⇄", title: "Phone and laptop, in sync", text: "Sign in with Google and your planner follows you. Edits from both devices are merged instead of overwritten." },
  { icon: "⌕", title: "Find anything", text: "Search every task, note, checklist and project update. Press ⌘K from anywhere." },
];

const timeline = [
  { time: "9:00", title: "Morning routine", tone: "sand" },
  { time: "10:30", title: "Design review", tone: "lavender" },
  { time: "1:00", title: "Lunch with Sam", tone: "sage" },
  { time: "3:30", title: "Finish essay draft", tone: "peach" },
];

export default function LandingPage() {
  return <div className="landing">
    <header className="landing-nav">
      <Link className="brand landing-brand" href="/" aria-label="Aurea home"><AureaLogo size={32} />Aurea</Link>
      <nav aria-label="Site"><a href="#features">Features</a><a href="#install">Install</a><Link href="/privacy">Privacy</Link></nav>
      <LandingCta className="soft-button landing-nav-cta" newLabel="Open Aurea" />
    </header>

    <main>
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="eyebrow">PERSONAL PLANNER</span>
          <h1>A calmer place for everything your day needs.</h1>
          <p>Plan your day, keep projects moving and build routines in one quiet, beautiful planner that syncs between your phone and laptop.</p>
          <div className="landing-actions"><LandingCta /><a className="text-button" href="#features">See what’s inside ↓</a></div>
          <p className="landing-fineprint">Free · No ads · Works on iPhone, Android and desktop</p>
        </div>
        <div className="landing-preview" aria-hidden="true">
          <div className="preview-window">
            <div className="preview-sidebar">
              <div className="preview-brand"><AureaLogo size={22} />Aurea</div>
              <div className="preview-nav active">Today</div>
              <div className="preview-nav">Projects</div>
              <div className="preview-nav">Calendar</div>
            </div>
            <div className="preview-main">
              <div className="preview-date">Tuesday, Oct 20</div>
              <div className="preview-summary">4 tasks · 2 routines</div>
              {timeline.map((item) => <div className="preview-row" key={item.time}><span>{item.time}</span><div className={`preview-block ${item.tone}`}>{item.title}</div></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section" id="features">
        <h2>Everything in one calm place</h2>
        <div className="landing-features">{features.map((feature) => <article key={feature.title} className="landing-feature"><span className="landing-feature-icon" aria-hidden="true">{feature.icon}</span><h3>{feature.title}</h3><p>{feature.text}</p></article>)}</div>
      </section>

      <section className="landing-section" id="install">
        <h2>Install it like an app</h2>
        <p className="landing-section-intro">No app store needed. Aurea installs straight from your browser and opens full screen, like any other app.</p>
        <div className="landing-install">
          <article><h3>iPhone &amp; iPad</h3><ol><li>Open Aurea in <strong>Safari</strong></li><li>Tap <strong>Share</strong></li><li>Tap <strong>Add to Home Screen</strong></li></ol></article>
          <article><h3>Android</h3><ol><li>Open Aurea in <strong>Chrome</strong></li><li>Tap the <strong>⋮</strong> menu</li><li>Tap <strong>Install app</strong></li></ol></article>
          <article><h3>Laptop</h3><ol><li>Just open Aurea in your browser</li><li>In Chrome or Edge, click the <strong>install</strong> icon in the address bar to keep it in your dock</li></ol></article>
        </div>
      </section>

      <section className="landing-section landing-promise">
        <h2>Your planner is yours</h2>
        <p>No ads. No tracking. Your data is never sold. Export a backup or delete your account any time, right from Settings.</p>
        <Link className="text-button" href="/privacy">Read the privacy policy →</Link>
      </section>

      <section className="landing-final">
        <h2>Give your day some breathing room.</h2>
        <LandingCta />
      </section>
    </main>

    <footer className="landing-footer">
      <span>© 2026 Aurea</span>
      <Link href="/privacy">Privacy</Link>
      <Link href="/terms">Terms</Link>
      {SUPPORT_EMAIL && <a href={`mailto:${SUPPORT_EMAIL}`}>Contact</a>}
    </footer>
  </div>;
}
