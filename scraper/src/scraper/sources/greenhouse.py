"""Greenhouse Job Board API.

GET https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true
No auth required. `content` is HTML-escaped, so unescape it.
"""

from __future__ import annotations

import html
from datetime import datetime

import httpx

from scraper.models import RawJob

API = "https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true"


def fetch(client: httpx.Client, token: str) -> list[RawJob]:
    resp = client.get(API.format(token=token))
    resp.raise_for_status()
    jobs = []
    for j in resp.json().get("jobs", []):
        posted = j.get("first_published") or j.get("updated_at")
        jobs.append(
            RawJob(
                source="greenhouse",
                external_id=str(j["id"]),
                title=j["title"],
                description_html=html.unescape(j.get("content") or "") or None,
                raw_location=(j.get("location") or {}).get("name") or "",
                application_url=j["absolute_url"],
                external_url=j["absolute_url"],
                posted_at=datetime.fromisoformat(posted) if posted else None,
            )
        )
    return jobs
