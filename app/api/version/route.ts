export const dynamic = "force-dynamic";

/** The version currently deployed, so open copies of Aurea can tell when they're out of date. */
export function GET() {
  return Response.json({ version: process.env.VERCEL_GIT_COMMIT_SHA ?? null }, { headers: { "Cache-Control": "no-store" } });
}
