"""Workday CXS jobs API (the JSON backend of myworkdayjobs.com career pages).

Not officially documented, but public and unauthenticated — it is exactly what
the career site's own frontend calls.

Registry token format: "tenant@host@site", e.g.
    "nvidia@wd5@NVIDIAExternalCareerSite"
maps to
    POST https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite/jobs

We search with searchText="intern" (server-side filter), page through results,
then fetch each posting's detail for the description and full location list.
Only titles that pass the intern filter get a detail request.
"""

from __future__ import annotations

import httpx

from scraper.models import RawJob
from scraper.normalize.intern_filter import is_internship

PAGE = 20  # CXS max page size
MAX_JOBS = 400  # safety cap per tenant


def _urls(token: str) -> tuple[str, str]:
    tenant, host, site = token.split("@")
    base = f"https://{tenant}.{host}.myworkdayjobs.com"
    return f"{base}/wday/cxs/{tenant}/{site}", f"{base}/en-US/{site}"


def fetch(client: httpx.Client, token: str) -> list[RawJob]:
    api_base, public_base = _urls(token)

    postings: list[dict] = []
    offset = 0
    while offset < MAX_JOBS:
        resp = client.post(
            f"{api_base}/jobs",
            json={"appliedFacets": {}, "limit": PAGE, "offset": offset, "searchText": "intern"},
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        data = resp.json()
        batch = data.get("jobPostings", [])
        postings.extend(batch)
        offset += PAGE
        if offset >= data.get("total", 0) or not batch:
            break

    jobs = []
    for p in postings:
        title = p.get("title") or ""
        path = p.get("externalPath") or ""
        if not path or not is_internship(title):
            continue
        try:
            detail = client.get(f"{api_base}{path}", headers={"Accept": "application/json"})
            detail.raise_for_status()
            info = detail.json().get("jobPostingInfo", {})
        except httpx.HTTPError:
            info = {}

        locations = [info.get("location") or p.get("locationsText") or ""]
        locations += info.get("additionalLocations") or []
        jobs.append(
            RawJob(
                source="workday",
                external_id=f"{token}:{path}",
                title=title,
                description_html=info.get("jobDescription") or None,
                raw_location="; ".join(loc for loc in locations if loc),
                application_url=f"{public_base}{path}",
                external_url=f"{public_base}{path}",
                posted_at=None,  # Workday only exposes "Posted N days ago" text
            )
        )
    return jobs
