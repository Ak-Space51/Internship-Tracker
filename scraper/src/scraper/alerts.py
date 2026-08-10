"""Email alerts: match new jobs against subscriptions and send digests.

Run `scraper alerts` after each ingest (same cron). Delivery goes through
Resend when RESEND_API_KEY is set; otherwise the digest is printed to stdout
as a dry run and nothing is recorded, so the first real send still covers
those jobs.
"""

from __future__ import annotations

import os

import httpx

TARGET_COUNTRIES = ["India", "Singapore", "United Kingdom", "Hong Kong", "Remote"]
# `or` fallback: in GitHub Actions an unset var/secret expands to "" rather than unset
FROM_ADDRESS = os.environ.get("ALERTS_FROM") or "TrackInternships <alerts@resend.dev>"
SITE_URL = os.environ.get("SITE_URL") or "http://localhost:3000"


def _matches(conn, sub, target_season: str) -> list[tuple]:
    seasons = list(sub["seasons"]) or [target_season, "off-cycle"]
    countries = list(sub["countries"]) or TARGET_COUNTRIES
    params: dict = {
        "sub_id": sub["id"],
        "seasons": seasons,
        "countries": countries,
    }
    clauses = ""
    if sub["roles"]:
        clauses += " AND j.role_category = ANY(%(roles)s)"
        params["roles"] = list(sub["roles"])
    if sub["keywords"]:
        clauses += " AND j.title ILIKE ANY(%(keywords)s)"
        params["keywords"] = [f"%{k}%" for k in sub["keywords"]]

    return conn.execute(
        f"""
        SELECT j.id, j.title, c.name, j.country, j.city, j.season, j.application_url
        FROM jobs j JOIN companies c ON c.id = j.company_id
        WHERE j.is_active
          AND j.season = ANY(%(seasons)s)
          AND j.country = ANY(%(countries)s)
          {clauses}
          AND NOT EXISTS (
              SELECT 1 FROM alert_deliveries d
              WHERE d.subscription_id = %(sub_id)s AND d.job_id = j.id
          )
        ORDER BY coalesce(j.posted_at, j.first_seen_at) DESC
        LIMIT 50
        """,
        params,
    ).fetchall()


def _digest_html(jobs: list[tuple], target_season: str, token: str | None = None) -> str:
    items = "".join(
        f'<li style="margin-bottom:12px">'
        f'<a href="{url}"><strong>{title}</strong></a><br>'
        f"{company} · {city + ', ' if city and city != country else ''}{country} · {season}"
        f"</li>"
        for _, title, company, country, city, season, url in jobs
    )
    # Every bulk email needs a working opt-out; without it this can't be shared.
    unsubscribe = (
        f"<p style='color:#71717a;font-size:12px'>"
        f"<a href='{SITE_URL}/alerts/unsubscribe?token={token}'>Unsubscribe</a>"
        f" from these alerts.</p>"
        if token
        else ""
    )
    return (
        f"<h2>{len(jobs)} new internship{'s' if len(jobs) != 1 else ''} matching your alert</h2>"
        f"<ul style='list-style:none;padding:0'>{items}</ul>"
        f"<p><a href='{SITE_URL}'>Browse all internships</a></p>"
        f"{unsubscribe}"
    )


def _send(client: httpx.Client, api_key: str, to: str, subject: str, html: str) -> None:
    resp = client.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {api_key}"},
        json={"from": FROM_ADDRESS, "to": [to], "subject": subject, "html": html},
    )
    if resp.is_error:
        # Surface Resend's error body — raise_for_status alone hides the reason
        raise RuntimeError(f"Resend returned {resp.status_code}: {resp.text}")


def run_alerts(conn) -> tuple[int, int, int]:
    """Returns (subscriptions processed, emails sent or printed, send failures)."""
    api_key = os.environ.get("RESEND_API_KEY")
    target_season = conn.execute(
        "SELECT value FROM settings WHERE key = 'target_season'"
    ).fetchone()[0]

    subs = conn.execute(
        """
        SELECT id, email, seasons, countries, roles, keywords, unsubscribe_token
        FROM alert_subscriptions
        WHERE unsubscribed_at IS NULL
          -- double opt-in: never mail an address whose owner hasn't confirmed
          AND confirmed_at IS NOT NULL
        """
    ).fetchall()
    fields = ["id", "email", "seasons", "countries", "roles", "keywords", "token"]
    sent = 0
    failed = 0
    with httpx.Client(timeout=30) as client:
        for row in subs:
            sub = dict(zip(fields, row))
            jobs = _matches(conn, sub, target_season)
            if not jobs:
                continue
            subject = f"{len(jobs)} new internship{'s' if len(jobs) != 1 else ''} for you"
            html = _digest_html(jobs, target_season, str(sub["token"]))
            if api_key:
                try:
                    _send(client, api_key, sub["email"], subject, html)
                except (RuntimeError, httpx.HTTPError) as exc:
                    # Skip delivery recording so these jobs are retried next run
                    print(f"FAILED to email {sub['email']}: {exc}")
                    failed += 1
                    continue
                # psycopg3 only exposes executemany on cursors, not the connection
                with conn.cursor() as cur:
                    cur.executemany(
                        "INSERT INTO alert_deliveries (subscription_id, job_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                        [(sub["id"], j[0]) for j in jobs],
                    )
                conn.commit()
            else:
                print(f"[dry run — RESEND_API_KEY unset] would email {sub['email']}:")
                for _, title, company, *_ in jobs[:10]:
                    print(f"    {title} — {company}")
                if len(jobs) > 10:
                    print(f"    … and {len(jobs) - 10} more")
            sent += 1
    return len(subs), sent, failed
