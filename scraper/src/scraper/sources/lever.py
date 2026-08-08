"""Lever public postings API.

GET https://api.lever.co/v0/postings/{token}?mode=json
No auth required.
"""

from __future__ import annotations

from datetime import datetime, timezone

import httpx

from scraper.models import RawJob

API = "https://api.lever.co/v0/postings/{token}?mode=json"


def fetch(client: httpx.Client, token: str) -> list[RawJob]:
    resp = client.get(API.format(token=token))
    resp.raise_for_status()
    jobs = []
    for j in resp.json():
        categories = j.get("categories") or {}
        location = categories.get("location") or ""
        all_locations = j.get("workplaceType") or ""
        created = j.get("createdAt")
        jobs.append(
            RawJob(
                source="lever",
                external_id=j["id"],
                title=j["text"],
                description_html=j.get("description") or None,
                raw_location=f"{location} {all_locations}".strip(),
                application_url=j.get("applyUrl") or j["hostedUrl"],
                external_url=j["hostedUrl"],
                posted_at=(
                    datetime.fromtimestamp(created / 1000, tz=timezone.utc)
                    if created
                    else None
                ),
            )
        )
    return jobs
