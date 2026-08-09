import { Pool } from "pg";

declare global {
  var _pgPool: Pool | undefined;
}

// Reuse the pool across dev hot-reloads.
const connectionString =
  process.env.DATABASE_URL ?? "postgresql://intern:intern@localhost:5432/internships";

export const pool =
  globalThis._pgPool ??
  new Pool({
    connectionString,
    // Supabase requires TLS but signs with its own CA.
    ssl: connectionString.includes("supabase")
      ? { rejectUnauthorized: false }
      : undefined,
    // Serverless: every function instance gets its own pool, so keep it small.
    // Use Supabase's transaction-mode pooler (port 6543) in production.
    max: connectionString.includes("supabase") ? 3 : 10,
  });
globalThis._pgPool = pool;

export type JobRow = {
  id: number;
  title: string;
  company_name: string;
  company_slug: string;
  country: string | null;
  city: string | null;
  work_mode: string;
  role_category: string;
  role: string | null;
  season: string;
  season_confidence: string;
  duration_months: number | null;
  comp_min: number | null;
  comp_max: number | null;
  comp_currency: string | null;
  comp_period: string | null;
  application_url: string;
  posted_at: string | null;
  first_seen_at: string;
};

export type CompanyGroup = {
  company_name: string;
  company_slug: string;
  jobs: JobRow[];
};

export type JobDetail = JobRow & {
  description_html: string | null;
  raw_location: string | null;
  company_website: string | null;
};

export type Filters = {
  q?: string;
  seasons: string[];
  countries: string[];
  roles: string[];
  companies: string[];
  page: number;
};

export type FacetCount = { value: string; count: number };

const PAGE_SIZE = 20; // companies per page (grouped view)

/** When the scraper last touched a job. Every ingest stamps last_seen_at on
 * every job it sees, so this doubles as a pipeline-health signal: if it stops
 * advancing, the scheduled ingest has stalled. */
export async function getLastIngestAt(): Promise<string | null> {
  try {
    const { rows } = await pool.query(
      "SELECT max(last_seen_at) AS at FROM jobs WHERE is_active"
    );
    return rows[0]?.at ?? null;
  } catch {
    return null;
  }
}

export async function getTargetSeason(): Promise<string> {
  const { rows } = await pool.query(
    "SELECT value FROM settings WHERE key = 'target_season'"
  );
  return rows[0]?.value ?? "summer-2027";
}

function buildWhere(
  f: Filters,
  opts: { skip?: "seasons" | "countries" | "roles" | "companies" } = {}
): { sql: string; params: unknown[] } {
  const clauses = ["j.is_active"];
  const params: unknown[] = [];
  const p = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };

  if (f.q) {
    clauses.push(
      `(j.search_tsv @@ websearch_to_tsquery('english', ${p(f.q)}) OR c.name ILIKE ${p(`%${f.q}%`)})`
    );
  }
  if (opts.skip !== "seasons" && f.seasons.length)
    clauses.push(`j.season = ANY(${p(f.seasons)})`);
  if (opts.skip !== "countries" && f.countries.length)
    clauses.push(`j.country = ANY(${p(f.countries)})`);
  if (opts.skip !== "roles" && f.roles.length)
    clauses.push(`j.role_category = ANY(${p(f.roles)})`);
  if (opts.skip !== "companies" && f.companies.length)
    clauses.push(`c.slug = ANY(${p(f.companies)})`);

  return { sql: clauses.join(" AND "), params };
}

const JOB_COLUMNS = `j.id, j.title, c.name AS company_name, c.slug AS company_slug,
            j.country, j.city, j.work_mode, j.role_category, j.role,
            j.season, j.season_confidence, j.duration_months,
            j.comp_min::float8 AS comp_min, j.comp_max::float8 AS comp_max,
            j.comp_currency, j.comp_period,
            j.application_url, j.posted_at, j.first_seen_at`;

/** Jobs grouped by company. Pagination is by company: a company appears with
 * all of its matching roles on one page. Companies are ordered by whether they
 * have a target-season role, then by their most recent posting. */
export async function getGroupedJobs(
  f: Filters,
  targetSeason: string
): Promise<{ groups: CompanyGroup[]; totalJobs: number; totalCompanies: number }> {
  const where = buildWhere(f);

  const companyParams = [...where.params, targetSeason];
  const target = `$${companyParams.length}`;
  companyParams.push(PAGE_SIZE, (f.page - 1) * PAGE_SIZE);
  const limit = `$${companyParams.length - 1}`;
  const offset = `$${companyParams.length}`;

  const companies = await pool.query(
    `SELECT c.id, c.name, c.slug,
            count(*) OVER() AS total_companies,
            sum(count(*)) OVER()::int AS total_jobs
     FROM jobs j JOIN companies c ON c.id = j.company_id
     WHERE ${where.sql}
     GROUP BY c.id, c.name, c.slug
     ORDER BY bool_or(j.season = ${target}) DESC,
              max(coalesce(j.posted_at, j.first_seen_at)) DESC
     LIMIT ${limit} OFFSET ${offset}`,
    companyParams
  );
  if (!companies.rows.length) return { groups: [], totalJobs: 0, totalCompanies: 0 };

  const ids = companies.rows.map((r) => r.id);
  const jobParams = [...where.params, ids, targetSeason];
  const idsParam = `$${jobParams.length - 1}`;
  const target2 = `$${jobParams.length}`;

  const jobs = await pool.query(
    `SELECT ${JOB_COLUMNS}
     FROM jobs j JOIN companies c ON c.id = j.company_id
     WHERE ${where.sql} AND j.company_id = ANY(${idsParam})
     ORDER BY (j.season = ${target2}) DESC,
              coalesce(j.posted_at, j.first_seen_at) DESC`,
    jobParams
  );

  const byCompany = new Map<string, JobRow[]>();
  for (const job of jobs.rows) {
    const list = byCompany.get(job.company_slug) ?? [];
    list.push(job);
    byCompany.set(job.company_slug, list);
  }
  return {
    groups: companies.rows.map((c) => ({
      company_name: c.name,
      company_slug: c.slug,
      jobs: byCompany.get(c.slug) ?? [],
    })),
    totalJobs: Number(companies.rows[0].total_jobs),
    totalCompanies: Number(companies.rows[0].total_companies),
  };
}

export async function getFacets(
  f: Filters
): Promise<Record<"seasons" | "countries" | "roles" | "companies", FacetCount[]>> {
  const facet = async (
    dim: "seasons" | "countries" | "roles" | "companies",
    expr: string
  ): Promise<FacetCount[]> => {
    const where = buildWhere(f, { skip: dim });
    const { rows } = await pool.query(
      `SELECT ${expr} AS value, count(*)::int AS count
       FROM jobs j JOIN companies c ON c.id = j.company_id
       WHERE ${where.sql} AND ${expr} IS NOT NULL
       GROUP BY 1 ORDER BY count DESC, value`,
      where.params
    );
    return rows;
  };

  const [seasons, countries, roles, companies] = await Promise.all([
    facet("seasons", "j.season"),
    facet("countries", "j.country"),
    facet("roles", "j.role_category"),
    facet("companies", "c.slug || '|' || c.name"),
  ]);
  return { seasons, countries, roles, companies };
}

export async function getJob(id: number): Promise<JobDetail | null> {
  const { rows } = await pool.query(
    `SELECT ${JOB_COLUMNS},
            c.website AS company_website,
            j.description_html, j.raw_location
     FROM jobs j JOIN companies c ON c.id = j.company_id
     WHERE j.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export { PAGE_SIZE };
