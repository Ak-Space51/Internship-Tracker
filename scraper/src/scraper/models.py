from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class RawJob(BaseModel):
    """What every source fetcher emits, before normalization."""

    source: str  # greenhouse | ashby | lever
    external_id: str
    title: str
    description_html: str | None = None
    raw_location: str = ""
    application_url: str
    external_url: str
    posted_at: datetime | None = None
    # Structured compensation, when the ATS provides it (Ashby does).
    comp_min: float | None = None
    comp_max: float | None = None
    comp_currency: str | None = None
    comp_period: str | None = None  # year | month | week | day | hour


class NormalizedJob(BaseModel):
    """A RawJob after classification, ready for upsert."""

    raw: RawJob
    country: str  # India | Singapore | United Kingdom | Hong Kong | Remote | Other
    city: str | None
    work_mode: str  # remote | hybrid | onsite | unknown
    role_category: str
    role: str | None
    season: str  # e.g. summer-2027, winter-2026, off-cycle, unknown
    season_confidence: str  # explicit | inferred | unknown
    duration_months: int | None
    comp_min: float | None = None
    comp_max: float | None = None
    comp_currency: str | None = None
    comp_period: str | None = None


class Company(BaseModel):
    name: str
    slug: str
    ats: str  # greenhouse | ashby | lever
    ats_token: str
    website: str | None = None
    careers_url: str | None = None
