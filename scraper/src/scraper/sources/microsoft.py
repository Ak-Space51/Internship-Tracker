"""Microsoft careers search API (apply.careers.microsoft.com).

GET /api/pcsx/search?q=intern&location=<country>&domain=microsoft.com&hl=en&start=N
Public, unauthenticated, 10 results per page via `start`. Descriptions come
from /api/pcsx/position_details.

This replaced the retired gcsservices.careers.microsoft.com API; the old host
now 404s. Registry token is a comma-separated list of location queries, e.g.
"India,Singapore,United Kingdom".
"""

from __future__ import annotations

from datetime import datetime, timezone

import httpx

from scraper.models import RawJob
from scraper.normalize.intern_filter import is_internship

BASE = "https://apply.careers.microsoft.com"
SEARCH = f"{BASE}/api/pcsx/search"
DETAILS = f"{BASE}/api/pcsx/position_details"
PAGE = 10
MAX_RESULTS = 300
HEADERS = {"Accept": "application/json", "Referer": f"{BASE}/careers"}


def _posted(ts: int | None) -> datetime | None:
    if not ts:
        return None
    try:
        # postedTs is epoch milliseconds
        return datetime.fromtimestamp(ts / 1000, tz=timezone.utc)
    except (ValueError, OSError, TypeError):
        return None


def _description(client: httpx.Client, position_id: str) -> str | None:
    try:
        resp = client.get(
            DETAILS,
            params={"position_id": position_id, "domain": "microsoft.com", "hl": "en"},
            headers=HEADERS,
        )
        resp.raise_for_status()
        data = resp.json().get("data") or {}
        position = data.get("position") or data
        for key in ("description", "job_description", "descriptionHtml", "jobDescription"):
            if position.get(key):
                return position[key]
    except (httpx.HTTPError, ValueError):
        pass
    return None


def fetch(client: httpx.Client, token: str) -> list[RawJob]:
    jobs: dict[str, RawJob] = {}
    for location in token.split(","):
        location = location.strip()
        start = 0
        while start < MAX_RESULTS:
            resp = client.get(
                SEARCH,
                params={
                    "q": "intern",
                    "location": location,
                    "domain": "microsoft.com",
                    "hl": "en",
                    "start": start,
                },
                headers=HEADERS,
            )
            resp.raise_for_status()
            data = resp.json().get("data") or {}
            positions = data.get("positions") or []
            if not positions:
                break

            for p in positions:
                title = p.get("name") or ""
                if not is_internship(title):
                    continue
                position_id = str(p["id"])
                if position_id in jobs:
                    continue
                url = f"{BASE}{p.get('positionUrl') or f'/careers/job/{position_id}'}"
                jobs[position_id] = RawJob(
                    source="microsoft",
                    external_id=position_id,
                    title=title,
                    description_html=_description(client, position_id),
                    raw_location="; ".join(p.get("locations") or [location]),
                    application_url=url,
                    external_url=url,
                    posted_at=_posted(p.get("postedTs")),
                )

            start += PAGE
            if start >= (data.get("count") or 0):
                break
    return list(jobs.values())
