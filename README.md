# TrackInternships

An internship aggregation platform targeting the **nearest upcoming internship season** (currently **Summer 2027**) in **India, Singapore, UK, and Hong Kong**.

Data flows one way: ATS APIs → Python ingestion pipeline → PostgreSQL → Next.js. The browser never talks to company APIs; Postgres is the single source of truth.

```
scraper (Python)             database              web (Next.js 16)
Greenhouse ┐
Ashby      │                                    ┌ filters/search (grouped by company)
Lever      ├─ fetch → normalize → upsert → Postgres ┤ saved jobs (localStorage)
Workday    │   (intern? season? location?       └ alert subscriptions
Amazon     ┘    role? stipend?)   ↑↓
                        LLM fallback (classify) + email digests (alerts)
```

## Layout

| Path | What |
|---|---|
| `scraper/` | Python (uv) ingestion pipeline: sources, normalizers, CLI |
| `scraper/companies.json` | Company registry — 61 verified ATS boards |
| `database/migrations/` | Raw SQL schema, shared by Python and TypeScript |
| `scripts/db-migrate.sh` | Applies unapplied migrations via the db container |
| `web/` | Next.js 16 + Tailwind v4 job board |
| `docker-compose.yml` | Postgres 17 |

## Setup

Requires: Docker (user in `docker` group), Node 20+, [uv](https://docs.astral.sh/uv/).

```bash
docker compose up -d --wait      # Postgres on :5432 (intern/intern, db "internships")
./scripts/db-migrate.sh          # apply schema

cd scraper
uv sync
uv run scraper ingest            # fetch all 50 boards (~1 min)
uv run scraper stats             # sanity-check the data

cd ../web
npm install
npm run dev                      # http://localhost:3000
```

`DATABASE_URL` overrides the default `postgresql://intern:intern@localhost:5432/internships` for both the scraper and the web app.

## How the season-first design works

- Every job gets a `season` (`summer-2027`, `off-cycle`, `unknown`, …) and a `season_confidence` (`explicit` / `inferred` / `unknown`), extracted by `scraper/src/scraper/normalize/seasons.py` from title, description, grad-year wording, and duration.
- `off-cycle` is a first-class season — India/Singapore internships are often 6-month placements with no "Summer" label.
- The UI reads `target_season` from the `settings` table. The homepage defaults to *target season + off-cycle + unknown*, sorts target-season jobs first, and hides past seasons unless explicitly selected.

**Rolling to the next season** (e.g. when Winter 2027 / Summer 2028 recruiting starts):

```sql
UPDATE settings SET value = 'summer-2028', updated_at = now() WHERE key = 'target_season';
```

That's the only change needed — the header, default filters, and sort order follow.

## Ingestion behavior

- Jobs are keyed by `(source, external_id)` in `job_sources`; re-runs update `last_seen_at` instead of duplicating.
- A job unseen for **3 consecutive successful runs** of its board is marked `is_active = false` with `closed_at` set — never deleted, so history is kept.
- A board fetch failure skips the company entirely (no false "closed" marks).
- Run `uv run scraper ingest` on a schedule (cron / GitHub Actions) to keep data fresh; `--company <slug>` ingests one board.

## Stipends

- **Listed** pay comes from the posting itself: Ashby's structured compensation API, or a regex pass over descriptions (`normalize/comp.py`) that catches "stipend of ₹50,000 per month", "S$1,800 monthly", lakh notation, ranges, etc. Stored in `comp_min/max/currency/period`.
- When a posting lists nothing, the UI shows a **market estimate** by role category × country (`web/lib/comp.ts`), always labeled "est." — tune the numbers there.

## Adding companies

Add an entry to `scraper/companies.json`:

```json
{"name": "Acme", "slug": "acme", "ats": "greenhouse", "ats_token": "acme", "website": "https://acme.com"}
```

Token = the board identifier in the ATS URL (`boards.greenhouse.io/<token>`, `jobs.ashbyhq.com/<token>`, `jobs.lever.co/<token>`). For Workday the token is `tenant@host@site`, taken from the career page URL `https://<tenant>.<host>.myworkdayjobs.com/<site>` (e.g. `nvidia@wd5@NVIDIAExternalCareerSite`). Verify it resolves:
`uv run scraper ingest --company acme`.

## LLM classification fallback

`uv run scraper classify` sends jobs the rules couldn't place (season unknown or role "Other") to Claude (`claude-opus-5`) in batches, filling only the missing fields — explicit rule-derived values are never overwritten, and each job is billed at most once (`jobs.llm_checked`). Requires `ANTHROPIC_API_KEY` (or `ant auth login`); without credentials it exits with instructions.

## Alerts

Subscribe at `/alerts` (per-email filters for location/role/keywords). `uv run scraper alerts` finds active matching jobs not yet delivered to each subscriber and emails a digest via [Resend](https://resend.com) when `RESEND_API_KEY` is set — without it, digests print to stdout as a dry run and nothing is marked delivered. `alert_deliveries` guarantees a job is emailed at most once per subscriber. Set `ALERTS_FROM` and `SITE_URL` for production.

## Deployment

The repo is push-ready for the standard free-tier stack:

1. **Supabase** (database): create a project, then point `DATABASE_URL` at its Postgres connection string and run `uv run scraper migrate` once.
2. **Vercel** (web): import the repo, set the root directory to `web/`, add the `DATABASE_URL` env var.
3. **GitHub Actions** (scheduled ingest): [.github/workflows/ingest.yml](.github/workflows/ingest.yml) runs migrate → ingest → classify → alerts every 6 hours. Add repository secrets `DATABASE_URL`, and optionally `ANTHROPIC_API_KEY` (classification) and `RESEND_API_KEY` (email delivery), plus a `SITE_URL` repository variable.

## Tests

```bash
cd scraper && uv run pytest      # normalizer suite: seasons, locations, roles, intern filter
cd web && npx next build         # typecheck + build
```

## Deferred (V3+)

Full accounts (saved jobs are currently per-browser via localStorage), application-status tracking (applied/interview/offer), bespoke scrapers for Microsoft/Goldman/DE Shaw/Flipkart-style portals (their JSON APIs need browser-side discovery), SmartRecruiters/iCIMS support, alert unsubscribe links + email confirmation.
