import type { Metadata } from "next";
import { Suspense } from "react";
import { AureaShell } from "@/components/aurea-shell";
import { TodayPlanner } from "@/components/today-planner";
import { AureaLogo } from "@/components/aurea-logo";

export const metadata: Metadata = { title: "Today" };

export default function TodayPage() {
  return <AureaShell active="today"><Suspense fallback={<div className="loading-screen"><span className="brand-mark"><AureaLogo size={36} />AUREA</span><p>Opening your day…</p></div>}><TodayPlanner /></Suspense></AureaShell>;
}
