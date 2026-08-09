import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// Freshness probe for the CloudWatch stall alarm in infra/. Deliberately
// uncached: it has to report the real state of the pipeline, not a snapshot
// taken up to five minutes ago.
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  try {
    const { rows } = await pool.query(
      `SELECT max(last_seen_at) AS last_ingest_at,
              count(*)::int      AS active_jobs
       FROM jobs WHERE is_active`
    );
    // Round trip from the serverless function to Postgres, which tells us
    // whether the two are in the same region.
    const dbMs = Date.now() - startedAt;
    const lastIngestAt: string | null = rows[0]?.last_ingest_at ?? null;
    const ageHours = lastIngestAt
      ? (Date.now() - new Date(lastIngestAt).getTime()) / 3_600_000
      : null;

    return NextResponse.json(
      {
        ok: true,
        lastIngestAt,
        ageHours: ageHours === null ? null : Number(ageHours.toFixed(2)),
        activeJobs: rows[0]?.active_jobs ?? 0,
        dbMs,
        region: process.env.VERCEL_REGION ?? null,
      },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "query failed" },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }
}
