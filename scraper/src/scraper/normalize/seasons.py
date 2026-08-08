"""Season extraction — the core of the season-first design.

Returns (season, confidence, duration_months):
  season:     "summer-2027", "winter-2026", "fall-2026", "spring-2027",
              "off-cycle", or "unknown"
  confidence: "explicit" (season+year stated), "inferred" (heuristic), "unknown"

Heuristics, in priority order:
  1. Season word + year in the title ("Summer 2027 Intern", "Intern (Summer '27)",
     "2027 Summer Analyst")  -> explicit
  2. Same patterns in the description                              -> explicit
  3. Off-cycle wording, or a stated duration with no season
     (common for India/Singapore postings)                         -> inferred
  4. Bare year ("Intern 2027", "2027 Internship")                  -> summer of
     that year, inferred (US/UK convention)
  5. Grad-year wording ("Class of 2027/2028", "graduating in 2028")-> summer of
     the earliest grad year, inferred (penultimate-year interns)
  6. Season word without a year ("Summer Internship")              -> the next
     future occurrence of that season, inferred
  7. Nothing found                                                 -> unknown
"""

from __future__ import annotations

import re
from datetime import date

SEASON_WORDS = r"(summer|spring|fall|autumn|winter)"
YEAR = r"(20\d{2}|'\d{2})"

# Month in which each season roughly starts, for "is it in the future" checks.
SEASON_START_MONTH = {"spring": 3, "summer": 6, "fall": 9, "winter": 12}

_SEASON_YEAR = re.compile(rf"\b{SEASON_WORDS}\s*[,\-–—/]?\s*{YEAR}\b", re.I)
_YEAR_SEASON = re.compile(rf"\b{YEAR}\s*[,\-–—/]?\s*{SEASON_WORDS}\b", re.I)
_OFF_CYCLE = re.compile(r"\boff[\s\-]?cycle\b", re.I)
_DURATION = re.compile(r"\b(\d{1,2})\s*(?:-|–|\s)?\s*months?\b", re.I)
_BARE_YEAR = re.compile(r"\b(20\d{2})\b")
_GRAD_YEAR = re.compile(
    r"(?:class\s+of|graduat\w+\s+(?:in|by|between)?)\s*[^.\n]{0,40}?(20\d{2})",
    re.I,
)
_SEASON_ALONE = re.compile(rf"\b{SEASON_WORDS}\s+(?:intern|analyst|placement)", re.I)


def _norm_year(y: str) -> int:
    return 2000 + int(y[1:]) if y.startswith("'") else int(y)


def _norm_season_word(w: str) -> str:
    w = w.lower()
    return "fall" if w == "autumn" else w


def _next_occurrence(season_word: str, today: date) -> int:
    """Year of the next future occurrence of a season."""
    year = today.year
    if today.month >= SEASON_START_MONTH[season_word]:
        year += 1
    return year


def extract_season(
    title: str, description: str | None = None, today: date | None = None
) -> tuple[str, str, int | None]:
    today = today or date.today()
    desc = description or ""
    duration = None
    if m := _DURATION.search(f"{title} {desc[:2000]}"):
        months = int(m.group(1))
        if 1 <= months <= 24:
            duration = months

    # 1 & 2: explicit season + year (title first, then description)
    for text in (title, desc):
        if not text:
            continue
        m = _SEASON_YEAR.search(text)
        if m:
            season, year = _norm_season_word(m.group(1)), _norm_year(m.group(2))
            return f"{season}-{year}", "explicit", duration
        m = _YEAR_SEASON.search(text)
        if m:
            season, year = _norm_season_word(m.group(2)), _norm_year(m.group(1))
            return f"{season}-{year}", "explicit", duration

    # 3: off-cycle wording, or duration-only postings (India/SG style)
    if _OFF_CYCLE.search(title) or _OFF_CYCLE.search(desc[:2000]):
        return "off-cycle", "explicit", duration

    # 4: bare year in the title
    if m := _BARE_YEAR.search(title):
        year = int(m.group(1))
        if today.year <= year <= today.year + 3:
            return f"summer-{year}", "inferred", duration

    # 5: grad-year wording in the description
    grad_years = [
        int(y) for y in _GRAD_YEAR.findall(desc[:4000]) if int(y) >= today.year
    ]
    if grad_years:
        return f"summer-{min(grad_years)}", "inferred", duration

    # 6: season word with no year, e.g. "Summer Internship"
    if m := _SEASON_ALONE.search(title):
        season = _norm_season_word(m.group(1))
        return f"{season}-{_next_occurrence(season, today)}", "inferred", duration

    # duration but no season signal at all -> likely off-cycle
    if duration is not None:
        return "off-cycle", "inferred", duration

    return "unknown", "unknown", duration
