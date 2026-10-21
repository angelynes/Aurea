import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Permanently deletes the signed-in person's account. Their planner, backups, reminder
 * devices and sent-reminder log are removed with it (all reference auth.users with
 * "on delete cascade").
 */
export async function POST(request: Request) {
  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SECRET_KEY) return Response.json({ error: "Account deletion is not configured." }, { status: 500 });

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Sign in again to delete your account." }, { status: 401 });

  const admin = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return Response.json({ error: "Sign in again to delete your account." }, { status: 401 });

  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) return Response.json({ error: "Could not delete your account. Try again, or contact support." }, { status: 500 });

  return Response.json({ deleted: true });
}
