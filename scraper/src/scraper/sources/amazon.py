"""amazon.jobs public search JSON (the careers site's own backend).

GET https://www.amazon.jobs/en/search.json
    ?base_query=intern&normalized_country_code[]=IND&result_limit=100&offset=0

Registry token: comma-separated ISO3 country codes to pull, e.g.
"IND,SGP,GBR,HKG". Each posting carries an `id_icims` requisition id used as
the stable external id.
"""

from __future__ import annotations

from datetime import datetime, timezone

import httpx

from scraper.models import RawJob

API = "https://www.amazon.jobs/en/search.json"
PAGE = 100


def _posted(raw: str | None) -> datetime | None:
    if not raw:
        return None
    try:
        return datetime.strptime(raw, "%B %d, %Y").replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def fetch(client: httpx.Client, token: str) -> list[RawJob]:
    jobs: dict[str, RawJob] = {}
    for country in token.split(","):
        offset = 0
        while True:
            resp = client.get(
                API,
                params={
                    "base_query": "intern",
                    "normalized_country_code[]": country.strip(),
                    "result_limit": PAGE,
                    "offset": offset,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            for j in data.get("jobs") or []:
                ext_id = str(j.get("id_icims") or j["id"])
                description = "".join(
                    part
                    for part in (
                        j.get("description"),
                        "<h3>Basic qualifications</h3>" if j.get("basic_qualifications") else "",
                        j.get("basic_qualifications"),
                        "<h3>Preferred qualifications</h3>" if j.get("preferred_qualifications") else "",
                        j.get("preferred_qualifications"),
                    )
                    if part
                )
                jobs[ext_id] = RawJob(
                    source="amazon",
                    external_id=ext_id,
                    title=j["title"],
                    description_html=description or None,
                    raw_location=j.get("normalized_location") or j.get("location") or "",
                    application_url=f"https://www.amazon.jobs{j['job_path']}",
                    external_url=f"https://www.amazon.jobs{j['job_path']}",
                    posted_at=_posted(j.get("posted_date")),
                )
            offset += PAGE
            if offset >= (data.get("hits") or 0):
                break
    return list(jobs.values())
