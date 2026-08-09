"""Atlassian careers listings endpoint.

GET https://www.atlassian.com/endpoint/careers/listings
Returns every open role as JSON, including description sections and the iCIMS
apply URL. The registry token is ignored (single-company source).
"""

from __future__ import annotations

import httpx

from scraper.models import RawJob

API = "https://www.atlassian.com/endpoint/careers/listings"


def fetch(client: httpx.Client, token: str) -> list[RawJob]:
    resp = client.get(API, headers={"Accept": "application/json"})
    resp.raise_for_status()

    jobs = []
    for j in resp.json():
        portal = j.get("portalJobPost") or {}
        url = portal.get("portalUrl") or j.get("applyUrl")
        if not url:
            continue
        description = "".join(
            part or ""
            for part in (j.get("overview"), j.get("responsibilities"), j.get("qualifications"))
        )
        jobs.append(
            RawJob(
                source="atlassian",
                external_id=str(j["id"]),
                title=j["title"],
                description_html=description or None,
                raw_location="; ".join(j.get("locations") or []),
                application_url=j.get("applyUrl") or url,
                external_url=url,
                posted_at=None,  # only an "updatedDate" string is exposed
            )
        )
    return jobs
