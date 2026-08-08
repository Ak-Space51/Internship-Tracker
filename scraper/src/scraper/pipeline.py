from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

import httpx

from scraper import db
from scraper.models import Company, NormalizedJob, RawJob
from scraper.normalize.comp import extract_compensation
from scraper.normalize.intern_filter import is_internship
from scraper.normalize.locations import normalize_location
from scraper.normalize.roles import classify_role
from scraper.normalize.seasons import extract_season
from scraper.sources import FETCHERS

REGISTRY = Path(__file__).resolve().parents[2] / "companies.json"


@dataclass
class CompanyResult:
    slug: str
    fetched: int = 0
    internships: int = 0
    closed: int = 0
    error: str | None = None


@dataclass
class RunSummary:
    results: list[CompanyResult] = field(default_factory=list)

    @property
    def ok(self) -> list[CompanyResult]:
        return [r for r in self.results if r.error is None]

    @property
    def failed(self) -> list[CompanyResult]:
        return [r for r in self.results if r.error is not None]


def load_registry(path: Path = REGISTRY) -> list[Company]:
    return [Company(**c) for c in json.loads(path.read_text())]


def normalize(raw: RawJob) -> NormalizedJob:
    country, city, work_mode = normalize_location(raw.raw_location)
    role_category, role = classify_role(raw.title)
    season, confidence, duration = extract_season(raw.title, raw.description_html)
    if raw.comp_min is not None:
        comp = (raw.comp_min, raw.comp_max, raw.comp_currency, raw.comp_period)
    else:
        comp = extract_compensation(raw.description_html) or (None, None, None, None)
    return NormalizedJob(
        raw=raw,
        country=country,
        city=city,
        work_mode=work_mode,
        role_category=role_category,
        role=role,
        season=season,
        season_confidence=confidence,
        duration_months=duration,
        comp_min=comp[0],
        comp_max=comp[1],
        comp_currency=comp[2],
        comp_period=comp[3],
    )


def ingest(only_slug: str | None = None) -> RunSummary:
    companies = load_registry()
    if only_slug:
        companies = [c for c in companies if c.slug == only_slug]
        if not companies:
            raise SystemExit(f"unknown company slug: {only_slug}")

    summary = RunSummary()
    with db.connect() as conn, httpx.Client(
        timeout=30, headers={"User-Agent": "TrackInternships/0.1"}
    ) as client:
        for company in companies:
            result = CompanyResult(slug=company.slug)
            summary.results.append(result)
            try:
                raw_jobs = FETCHERS[company.ats](client, company.ats_token)
            except Exception as exc:  # noqa: BLE001 — one bad board must not kill the run
                result.error = f"{type(exc).__name__}: {exc}"
                conn.rollback()
                continue

            result.fetched = len(raw_jobs)
            company_id = db.upsert_company(conn, company)
            seen_ids = []
            for raw in raw_jobs:
                if not is_internship(raw.title):
                    continue
                seen_ids.append(db.upsert_job(conn, company_id, normalize(raw)))
            result.internships = len(seen_ids)
            result.closed = db.sweep_unseen(conn, company_id, seen_ids)
            conn.commit()
    return summary
