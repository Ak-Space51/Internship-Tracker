"""LLM fallback classifier for jobs the rule-based normalizers couldn't place.

Only runs on active jobs where the season is unknown or the role fell through
to "Other", and only once per job (tracked via jobs.llm_checked). Rule-derived
explicit values are never overwritten. Runs as `scraper classify` — a separate,
opt-in step so `ingest` stays free of API dependencies.

Requires Anthropic API credentials (ANTHROPIC_API_KEY, or an `ant auth login`
profile). Without them the command explains and exits cleanly.
"""

from __future__ import annotations

import re
from datetime import date

from pydantic import BaseModel

MODEL = "claude-opus-5"
BATCH_SIZE = 25
# Duration and start-date wording often sits well below the intro blurb; at 1500
# chars we measured the classifier never seeing it on ~3% of postings.
DESCRIPTION_EXCERPT = 4000

SEASONS = [
    "summer-2026", "summer-2027", "summer-2028",
    "fall-2026", "fall-2027",
    "winter-2026", "winter-2027",
    "spring-2026", "spring-2027",
    "off-cycle", "unknown",
]
ROLE_CATEGORIES = ["SWE", "AI/ML", "Data", "Quant", "Hardware", "Product", "Other"]

_TAG = re.compile(r"<[^>]+>")


class JobClassification(BaseModel):
    id: int
    season: str
    role_category: str
    role: str | None


class ClassificationBatch(BaseModel):
    jobs: list[JobClassification]


def _prompt(rows: list[tuple], today: date) -> str:
    lines = [
        f"Today is {today.isoformat()}. Classify each internship posting below.",
        "",
        "For `season`, pick the recruiting season the internship is FOR, one of: "
        + ", ".join(SEASONS) + ".",
        "Notes: a posting with no season label that is clearly a rolling/6-month "
        "placement (common in India and Singapore) is `off-cycle`. A summer "
        "internship posted now with no year stated is for the NEXT summer. "
        "Roles that run alongside term time rather than in a fixed window — "
        "working-student/Werkstudent posts, mandatory or extracurricular "
        "university placements, industrial traineeships — are `off-cycle`, not "
        "`unknown`. Use `unknown` only when there is genuinely no signal; do "
        "not guess a season from the company or team alone.",
        "",
        "For `role_category`, one of: " + ", ".join(ROLE_CATEGORIES) + ".",
        "For `role`, a short specialization like 'Backend', 'Machine Learning', "
        "'Quant Research' — or null if the category alone describes it.",
        "",
        "Postings:",
    ]
    for job_id, title, description in rows:
        text = _TAG.sub(" ", description or "")[:DESCRIPTION_EXCERPT]
        lines.append(f"--- id={job_id}\ntitle: {title}\ndescription: {text}\n")
    return "\n".join(lines)


def classify_pending(conn, limit: int | None = None) -> tuple[int, int]:
    """Classify unresolved active jobs. Returns (attempted, updated)."""
    try:
        import anthropic
    except ImportError:
        raise SystemExit("The `anthropic` package is missing — run `uv sync`.")

    try:
        client = anthropic.Anthropic()
    except TypeError:
        raise SystemExit(
            "No Anthropic API credentials. Set ANTHROPIC_API_KEY or run "
            "`ant auth login`, then re-run `scraper classify`."
        )

    rows = conn.execute(
        """
        SELECT id, title, description_html FROM jobs
        WHERE is_active AND NOT llm_checked
          AND (season = 'unknown' OR role_category = 'Other')
        ORDER BY id
        """ + (f" LIMIT {int(limit)}" if limit else ""),
    ).fetchall()
    if not rows:
        return 0, 0

    today = date.today()
    updated = 0
    for start in range(0, len(rows), BATCH_SIZE):
        batch = rows[start : start + BATCH_SIZE]
        try:
            response = client.messages.parse(
                model=MODEL,
                max_tokens=16000,
                messages=[{"role": "user", "content": _prompt(batch, today)}],
                output_format=ClassificationBatch,
            )
        except (anthropic.AuthenticationError, TypeError):
            # TypeError = the SDK found no credential source at request time.
            raise SystemExit(
                "No Anthropic API credentials. Set ANTHROPIC_API_KEY or run "
                "`ant auth login`, then re-run `scraper classify`."
            )
        if response.stop_reason == "refusal":
            continue

        by_id = {r[0]: r for r in batch}
        for c in response.parsed_output.jobs:
            if c.id not in by_id or c.season not in SEASONS or c.role_category not in ROLE_CATEGORIES:
                continue
            # Fill only what the rules couldn't; never overwrite explicit values.
            conn.execute(
                """
                UPDATE jobs SET
                    season = CASE WHEN season = 'unknown' AND %(season)s != 'unknown'
                                  THEN %(season)s ELSE season END,
                    season_confidence = CASE WHEN season = 'unknown' AND %(season)s != 'unknown'
                                  THEN 'inferred' ELSE season_confidence END,
                    role_category = CASE WHEN role_category = 'Other' AND %(cat)s != 'Other'
                                  THEN %(cat)s ELSE role_category END,
                    role = COALESCE(role, %(role)s),
                    llm_checked = TRUE,
                    updated_at = now()
                WHERE id = %(id)s
                """,
                {"season": c.season, "cat": c.role_category, "role": c.role, "id": c.id},
            )
            updated += 1
        # Mark the whole batch checked so re-runs don't re-bill the same jobs.
        conn.execute(
            "UPDATE jobs SET llm_checked = TRUE WHERE id = ANY(%s)",
            ([r[0] for r in batch],),
        )
        conn.commit()
    return len(rows), updated
