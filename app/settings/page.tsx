import type { Metadata } from "next";
import { AureaShell } from "@/components/aurea-shell";
import { SettingsPanel } from "@/components/settings-panel";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return <AureaShell active="settings"><SettingsPanel /></AureaShell>;
}
