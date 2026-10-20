import type { Metadata } from "next";
import { AureaShell } from "@/components/aurea-shell";
import { CalendarPlanner } from "@/components/calendar-planner";

export const metadata: Metadata = { title: "Calendar" };

export default function CalendarPage() {
  return <AureaShell active="calendar"><CalendarPlanner /></AureaShell>;
}
