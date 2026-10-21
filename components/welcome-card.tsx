"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAurea } from "./aurea-provider";

/** First-run steps on Today. Each step ticks itself off once it's done; dismissing it syncs across devices. */
export function WelcomeCard({ onAddTask }: { onAddTask: () => void }) {
  const { state, hydrated, cloudEmail, pushEnabled, updateSettings } = useAurea();
  const [installed, setInstalled] = useState(false);
  const [triedSearch, setTriedSearch] = useState(false);

  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
  }, []);

  if (!hydrated || state.settings.welcomeDismissed || !state.settings.profileSetupComplete) return null;

  const steps = [
    { done: state.tasks.length > 0, title: "Add your first task", text: "Give it a time to place it on your schedule, or leave it unscheduled.", action: <button type="button" className="soft-button" onClick={onAddTask}>Add task</button> },
    { done: Boolean(cloudEmail), title: "Sign in to sync", text: "Keep your phone and laptop in sync with Continue with Google.", action: <Link className="soft-button" href="/settings">Open Settings</Link> },
    { done: installed, title: "Install Aurea on your phone", text: "Add it to your Home Screen so it opens like an app.", action: <Link className="soft-button" href="/#install">How to install</Link> },
    { done: pushEnabled || state.settings.notificationsEnabled, title: "Turn on reminders", text: "Get reminders on your phone, even when Aurea is closed.", action: <Link className="soft-button" href="/settings">Set up reminders</Link> },
    { done: triedSearch, title: "Find anything fast", text: "Search every task, note and project. Press ⌘K or / on a keyboard.", action: <button type="button" className="soft-button" onClick={() => { setTriedSearch(true); window.dispatchEvent(new Event("aurea:open-search")); }}>Try search</button> },
  ];
  const doneCount = steps.filter((step) => step.done).length;
  const dismiss = () => updateSettings({ welcomeDismissed: true });

  return <section className="panel welcome-card" aria-label="Getting started">
    <div className="welcome-heading">
      <div><span className="eyebrow">WELCOME TO AUREA</span><h2>Let’s set up your planner</h2><p>{doneCount} of {steps.length} done</p></div>
      <button type="button" className="welcome-close" onClick={dismiss} aria-label="Hide getting started">×</button>
    </div>
    <div className="welcome-progress"><i style={{ width: `${(doneCount / steps.length) * 100}%` }} /></div>
    <ol className="welcome-steps">
      {steps.map((step) => <li key={step.title} className={step.done ? "done" : ""}>
        <span className="welcome-check" aria-hidden="true">{step.done ? "✓" : ""}</span>
        <div><strong>{step.title}</strong><small>{step.text}</small></div>
        {!step.done && step.action}
      </li>)}
    </ol>
    {doneCount === steps.length && <div className="welcome-finish"><span>All set. Enjoy your calmer days. ✦</span><button type="button" className="primary-button" onClick={dismiss}>Done</button></div>}
  </section>;
}
