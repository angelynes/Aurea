import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AureaProvider } from "@/components/aurea-provider";
import { ReminderWatcher } from "@/components/reminder-watcher";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: { default: "Aurea Planner", template: "%s · Aurea" },
  description: "A calm personal planner for your day, projects, habits and calendar.",
  applicationName: "Aurea",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Aurea" },
};

export const viewport: Viewport = {
  themeColor: "#FAF9FC",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AureaProvider>
          <PwaRegister />
          <ReminderWatcher />
          {children}
        </AureaProvider>
      </body>
    </html>
  );
}
