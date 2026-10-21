"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** "Get started" for new visitors; "Open my planner" for people who already use Aurea on this device. */
export function LandingCta({ className = "primary-button landing-cta", newLabel = "Get started — it’s free" }: { className?: string; newLabel?: string }) {
  const [returning, setReturning] = useState(false);
  useEffect(() => {
    try {
      setReturning(Boolean(window.localStorage.getItem("aurea-planner-state-v2")));
    } catch {
      // Storage unavailable: treat as a new visitor.
    }
  }, []);
  return <Link className={className} href="/today">{returning ? "Open my planner" : newLabel}</Link>;
}
