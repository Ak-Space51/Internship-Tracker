from __future__ import annotations

import os

import psycopg

from scraper.models import Company, NormalizedJob

DEFAULT_DSN = "postgresql://intern:intern@localhost:5432/internships"


def connect() -> psycopg.Connection:
    return psycopg.connect(os.environ.get("DATABASE_URL", DEFAULT_DSN))


def upsert_company(conn: psycopg.Connection, company: Company) -> int:
    row = conn.execute(
        """
        INSERT INTO companies (name, slug, website, careers_url, ats, ats_token)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            website = EXCLUDED.website,
            careers_url = EXCLUDED.careers_url,
            ats = EXCLUDED.ats,
            ats_token = EXCLUDED.ats_token
        RETURNING id
        """,
        (
            company.name,
            company.slug,
            company.website,
            company.careers_url,
            company.ats,
            company.ats_token,
        ),
    ).fetchone()
    assert row is not None
    return row[0]


def upsert_job(conn: psycopg.Connection, company_id: int, job: NormalizedJob) -> int:
    """Insert or refresh a job keyed by its (source, external_id). Returns job id."""
    raw = job.raw
    existing = conn.execute(
        "SELECT job_id FROM job_sources WHERE source = %s AND external_id = %s",
        (raw.source, raw.external_id),
    ).fetchone()

    fields = (
        raw.title,
        raw.description_html,
        raw.raw_location,
        job.country,
        job.city,
        job.work_mode,
        job.role_category,
        job.role,
        job.season,
        job.season_confidence,
        job.duration_months,
        job.comp_min,
        job.comp_max,
        job.comp_currency,
        job.comp_period,
        raw.application_url,
        raw.posted_at,
    )

    if existing:
        job_id = existing[0]
        conn.execute(
            """
            UPDATE jobs SET
                title = %s, description_html = %s, raw_location = %s,
                country = %s, city = %s, work_mode = %s,
                role_category = %s, role = %s,
                season = %s, season_confidence = %s, duration_months = %s,
                comp_min = %s, comp_max = %s, comp_currency = %s, comp_period = %s,
                application_url = %s, posted_at = %s,
                last_seen_at = now(), missed_runs = 0,
                is_active = TRUE, closed_at = NULL, updated_at = now()
            WHERE id = %s
            """,
            fields + (job_id,),
        )
        conn.execute(
            "UPDATE job_sources SET last_seen_at = now() WHERE source = %s AND external_id = %s",
            (raw.source, raw.external_id),
        )
    else:
        row = conn.execute(
            """
            INSERT INTO jobs (
                company_id, title, description_html, raw_location,
                country, city, work_mode, role_category, role,
                season, season_confidence, duration_months,
                comp_min, comp_max, comp_currency, comp_period,
                application_url, posted_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (company_id,) + fields,
        ).fetchone()
        assert row is not None
        job_id = row[0]
        conn.execute(
            """
            INSERT INTO job_sources (job_id, source, external_id, external_url)
            VALUES (%s, %s, %s, %s)
            """,
            (job_id, raw.source, raw.external_id, raw.external_url),
        )
    return job_id


def sweep_unseen(conn: psycopg.Connection, company_id: int, seen_job_ids: list[int]) -> int:
    """After a successful fetch, bump missed_runs on this company's active jobs
    that were not seen; close jobs missed 3 times in a row. Returns closed count."""
    conn.execute(
        """
        UPDATE jobs SET missed_runs = missed_runs + 1, updated_at = now()
        WHERE company_id = %s AND is_active AND NOT (id = ANY(%s))
        """,
        (company_id, seen_job_ids or [0]),
    )
    closed = conn.execute(
        """
        UPDATE jobs SET is_active = FALSE, closed_at = now(), updated_at = now()
        WHERE company_id = %s AND is_active AND missed_runs >= 3
        RETURNING id
        """,
        (company_id,),
    ).fetchall()
    return len(closed)
