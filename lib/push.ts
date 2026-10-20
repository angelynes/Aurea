import type { SupabaseClient } from "@supabase/supabase-js";
import { resolvedTimeZone } from "@/lib/aurea/date";

export type PushSupport = "supported" | "unsupported" | "needs-install" | "not-configured";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  if (!VAPID_PUBLIC_KEY) return "not-configured";
  // iPhone/iPad only allow web push for apps added to the Home Screen.
  if (isIos() && !isStandalone()) return "needs-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  return "supported";
}

function urlBase64ToUint8Array(value: string) {
  const padded = (value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration()) ?? navigator.serviceWorker.register("/sw.js");
}

export async function currentPushSubscription() {
  if (pushSupport() !== "supported") return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export async function subscribeToPush(client: SupabaseClient, userId: string, timeZoneSetting: string) {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notifications are blocked. Allow them for Aurea in your browser or iPhone settings.");
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const subscription = (await reg.pushManager.getSubscription())
    ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!) });
  const json = subscription.toJSON();
  const { error } = await client.from("push_subscriptions").upsert({
    endpoint: subscription.endpoint,
    user_id: userId,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
    time_zone: resolvedTimeZone(timeZoneSetting),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function unsubscribeFromPush(client: SupabaseClient | null) {
  const subscription = await currentPushSubscription();
  if (!subscription) return;
  if (client) await client.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
  await subscription.unsubscribe();
}
