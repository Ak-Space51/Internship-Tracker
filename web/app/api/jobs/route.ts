import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

// Returns full job rows for a list of ids — used by the saved-jobs page,
// whose ids live in the browser's localStorage.
export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 200);
  if (!ids.length) return NextResponse.json({ jobs: [] });

  const { rows } = await pool.query(
    `SELECT j.id, j.title, c.name AS company_name, c.slug AS company_slug,
            j.country, j.city, j.work_mode, j.role_category, j.role,
            j.season, j.season_confidence, j.duration_months,
            j.comp_min::float8 AS comp_min, j.comp_max::float8 AS comp_max,
            j.comp_currency, j.comp_period,
            j.application_url, j.posted_at, j.first_seen_at, j.is_active
     FROM jobs j JOIN companies c ON c.id = j.company_id
     WHERE j.id = ANY($1)`,
    [ids]
  );
  return NextResponse.json({ jobs: rows });
}
