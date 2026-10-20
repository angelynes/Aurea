"use client";

import { useEffect } from "react";
import { zonedNow } from "@/lib/aurea/date";
import { dueReminders } from "@/lib/aurea/reminders";
import { useAurea } from "./aurea-provider";

export function ReminderWatcher() {
  const { state, hydrated, pushEnabled } = useAurea();

  useEffect(() => {
    // Devices with push reminders get them from the server, even while Aurea is open.
    if (!hydrated || pushEnabled || !state.settings.notificationsEnabled || typeof Notification === "undefined" || Notification.permission !== "granted") return;

    function check() {
      const now = zonedNow(state.settings.timeZone);
      dueReminders(state, now.dateKey, now.minutes).forEach((reminder) => {
        const key = `aurea-notified-${reminder.key}`;
        if (window.localStorage.getItem(key)) return;
        new Notification(reminder.title, { body: reminder.body, icon: "/icons/icon-192.png" });
        window.localStorage.setItem(key, "1");
      });
    }

    check();
    const timer = window.setInterval(check, 30_000);
    return () => window.clearInterval(timer);
  }, [hydrated, pushEnabled, state]);

  return null;
}
