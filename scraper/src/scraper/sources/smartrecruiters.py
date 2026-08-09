"""SmartRecruiters public postings API.

GET https://api.smartrecruiters.com/v1/companies/{token}/postings?limit=100&offset=N
No auth required. The list response has no description or apply URL, so each
posting that passes the intern filter gets one detail fetch.

Used by large employers with deep India/APAC presence (Bosch, Visa, Delivery
Hero, Avery Dennison, …).
"""

from __future__ import annotations

from datetime import datetime

import httpx

from scraper.models import RawJob
from scraper.normalize.intern_filter import is_internship

API = "https://api.smartrecruiters.com/v1/companies/{token}/postings"
PAGE = 100
MAX_POSTINGS = 1000


def _location(loc: dict) -> str:
    if not loc:
        return ""
    parts = [loc.get("city"), loc.get("region"), loc.get("country", "").upper()]
    text = ", ".join(p for p in parts if p)
    if loc.get("remote"):
        text += " Remote"
    if loc.get("hybrid"):
        text += " Hybrid"
    return text


def _description(job_ad: dict) -> str | None:
    sections = (job_ad or {}).get("sections") or {}
    order = ["jobDescription", "qualifications", "additionalInformation"]
    html = "".join(
        (sections.get(key) or {}).get("text") or "" for key in order
    )
    return html or None


def fetch(client: httpx.Client, token: str) -> list[RawJob]:
    listings: list[dict] = []
    offset = 0
    while offset < MAX_POSTINGS:
        resp = client.get(API.format(token=token), params={"limit": PAGE, "offset": offset})
        resp.raise_for_status()
        data = resp.json()
        listings.extend(data.get("content") or [])
        offset += PAGE
        if offset >= (data.get("totalFound") or 0):
            break

    jobs = []
    for item in listings:
        title = item.get("name") or ""
        if not is_internship(title):
            continue
        posting_id = str(item["id"])
        try:
            detail = client.get(f"{API.format(token=token)}/{posting_id}")
            detail.raise_for_status()
            info = detail.json()
        except httpx.HTTPError:
            info = {}

        released = info.get("releasedDate") or item.get("releasedDate")
        apply_url = (
            info.get("applyUrl")
            or info.get("postingUrl")
            or f"https://jobs.smartrecruiters.com/{token}/{posting_id}"
        )
        jobs.append(
            RawJob(
                source="smartrecruiters",
                external_id=f"{token}:{posting_id}",
                title=title,
                description_html=_description(info.get("jobAd")),
                raw_location=_location(info.get("location") or item.get("location") or {}),
                application_url=apply_url,
                external_url=info.get("postingUrl") or apply_url,
                posted_at=datetime.fromisoformat(released.replace("Z", "+00:00"))
                if released
                else None,
            )
        )
    return jobs
