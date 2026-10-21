import type { Metadata, Viewport } from "next";
import { Newsreader } from "next/font/google";
import "./globals.css";
import { AureaProvider } from "@/components/aurea-provider";
import { ReminderWatcher } from "@/components/reminder-watcher";
import { PwaRegister } from "@/components/pwa-register";

const serif = Newsreader({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Aurea Planner", template: "%s · Aurea" },
  description: "A calm personal planner for your day, projects, habits and calendar.",
  applicationName: "Aurea",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Aurea" },
};

export const viewport: Viewport = {
  themeColor: "#FBF8F3",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="aurea" className={serif.variable}>
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
