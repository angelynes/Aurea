import type { Metadata } from "next";
import { AureaShell } from "@/components/aurea-shell";
import { WeeklyReview } from "@/components/weekly-review";

export const metadata: Metadata = { title: "Weekly review" };

export default function ReviewPage() {
  return <AureaShell active="review"><WeeklyReview /></AureaShell>;
}
