"""Ashby public Job Postings API.

GET https://api.ashbyhq.com/posting-api/job-board/{token}
No auth required for published boards (POST returns 401).
"""

from __future__ import annotations

from datetime import datetime

import httpx

from scraper.models import RawJob

API = "https://api.ashbyhq.com/posting-api/job-board/{token}"


_INTERVALS = {
    "1 YEAR": "year",
    "1 MONTH": "month",
    "1 WEEK": "week",
    "1 DAY": "day",
    "1 HOUR": "hour",
}


def _parse_comp(j: dict) -> dict:
    """Pick the Salary component from Ashby's structured compensation."""
    comp = j.get("compensation") or {}
    for c in comp.get("summaryComponents") or []:
        if c.get("compensationType") == "Salary" and (
            c.get("minValue") is not None or c.get("maxValue") is not None
        ):
            lo = c.get("minValue") if c.get("minValue") is not None else c.get("maxValue")
            hi = c.get("maxValue") if c.get("maxValue") is not None else c.get("minValue")
            return {
                "comp_min": lo,
                "comp_max": hi,
                "comp_currency": c.get("currencyCode"),
                "comp_period": _INTERVALS.get(c.get("interval"), None),
            }
    return {}


def fetch(client: httpx.Client, token: str) -> list[RawJob]:
    resp = client.get(API.format(token=token), params={"includeCompensation": "true"})
    resp.raise_for_status()
    jobs = []
    for j in resp.json().get("jobs", []):
        locations = [j.get("location") or ""]
        locations += [
            s.get("location", "") for s in j.get("secondaryLocations") or []
        ]
        if j.get("isRemote"):
            locations.append("Remote")
        published = j.get("publishedAt")
        jobs.append(
            RawJob(
                source="ashby",
                external_id=j["id"],
                title=j["title"],
                description_html=j.get("descriptionHtml") or None,
                raw_location="; ".join(loc for loc in locations if loc),
                application_url=j.get("applyUrl") or j["jobUrl"],
                external_url=j["jobUrl"],
                posted_at=datetime.fromisoformat(published) if published else None,
                **_parse_comp(j),
            )
        )
    return jobs
