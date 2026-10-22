"use client";

import { useEffect, useState } from "react";

/** The version this copy of the app was built from (set automatically on Vercel). */
const RUNNING = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;

/**
 * Shows a reload bar when a newer version of Aurea has been published, checked when the app
 * comes back into view and every 10 minutes. Keeps long-open tabs from running old code.
 */
export function UpdateBanner() {
  const [outdated, setOutdated] = useState(false);

  useEffect(() => {
    if (!RUNNING) return;
    async function check() {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/version", { cache: "no-store" });
        const { version } = await response.json() as { version: string | null };
        if (version && version !== RUNNING) setOutdated(true);
      } catch {
        // Offline: check again later.
      }
    }
    check();
    const timer = window.setInterval(check, 10 * 60 * 1000);
    document.addEventListener("visibilitychange", check);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", check); };
  }, []);

  if (!outdated) return null;
  return <div className="update-banner" role="status">
    <span>A new version of Aurea is ready.</span>
    <button type="button" className="primary-button" onClick={() => window.location.reload()}>Reload</button>
  </div>;
}
