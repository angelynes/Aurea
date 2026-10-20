import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { zonedNow } from "@/lib/aurea/date";
import { dueReminders, type DueReminder } from "@/lib/aurea/reminders";
import type { AureaState } from "@/lib/aurea/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Minutes of catch-up, in case a scheduled call arrives late. Duplicates are prevented by sent_reminders. */
const LOOKBACK_MINUTES = 2;

type PushSubscriptionRow = { endpoint: string; user_id: string; p256dh: string; auth: string; time_zone: string };

/**
 * Called every minute by Supabase pg_cron (see supabase/push-reminders.sql).
 * Sends due task/routine reminders to every subscribed device, even when Aurea is closed.
 */
export async function POST(request: Request) {
  const { CRON_SECRET, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
  if (!CRON_SECRET || request.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SECRET_KEY || !NEXT_PUBLIC_VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return Response.json({ error: "push reminders are not configured" }, { status: 500 });
  }

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://my-aurea-planner.vercel.app", NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

  const { data: subscriptions, error: subscriptionError } = await supabase.from("push_subscriptions").select("endpoint, user_id, p256dh, auth, time_zone");
  if (subscriptionError) return Response.json({ error: subscriptionError.message }, { status: 500 });
  if (!subscriptions?.length) return Response.json({ sent: 0 });

  const byUser = new Map<string, PushSubscriptionRow[]>();
  for (const row of subscriptions as PushSubscriptionRow[]) byUser.set(row.user_id, [...(byUser.get(row.user_id) ?? []), row]);

  const { data: states, error: stateError } = await supabase.from("app_state").select("user_id, data").in("user_id", [...byUser.keys()]);
  if (stateError) return Response.json({ error: stateError.message }, { status: 500 });

  let sent = 0;
  const expired: string[] = [];

  for (const { user_id: userId, data } of states ?? []) {
    const state = data as AureaState;
    if (!state?.tasks || state.settings?.notificationsEnabled === false) continue;

    // An explicit time zone setting wins; "auto" uses the zone each device reported.
    const byZone = new Map<string, PushSubscriptionRow[]>();
    for (const row of byUser.get(userId) ?? []) {
      const zone = state.settings.timeZone && state.settings.timeZone !== "auto" ? state.settings.timeZone : row.time_zone;
      byZone.set(zone, [...(byZone.get(zone) ?? []), row]);
    }

    for (const [zone, rows] of byZone) {
      const now = zonedNow(zone);
      const due = dueReminders(state, now.dateKey, now.minutes, LOOKBACK_MINUTES);
      if (!due.length) continue;

      // Claim each reminder once; rows already present were sent by an earlier run.
      const { data: claimed, error: claimError } = await supabase
        .from("sent_reminders")
        .upsert(due.map((reminder) => ({ user_id: userId, reminder_key: reminder.key })), { onConflict: "user_id,reminder_key", ignoreDuplicates: true })
        .select("reminder_key");
      if (claimError) continue;
      const claimedKeys = new Set((claimed ?? []).map((row) => row.reminder_key as string));

      for (const reminder of due.filter((item: DueReminder) => claimedKeys.has(item.key))) {
        const payload = JSON.stringify({ title: reminder.title, body: reminder.body, tag: reminder.key, url: "/today" });
        await Promise.all(rows.map(async (row) => {
          try {
            await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, payload, { TTL: 300 });
            sent += 1;
          } catch (error) {
            const status = (error as { statusCode?: number }).statusCode;
            if (status === 404 || status === 410) expired.push(row.endpoint);
          }
        }));
      }
    }
  }

  if (expired.length) await supabase.from("push_subscriptions").delete().in("endpoint", expired);
  if (new Date().getUTCMinutes() === 0) {
    await supabase.from("sent_reminders").delete().lt("sent_at", new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString());
  }

  return Response.json({ sent, expired: expired.length });
}
