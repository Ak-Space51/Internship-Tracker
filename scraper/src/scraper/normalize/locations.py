"""Raw ATS location strings -> (country, city, work_mode).

Countries: India | Singapore | United Kingdom | Hong Kong | Remote | Other
"""

from __future__ import annotations

import re

# city keyword -> (country, canonical city name)
_CITIES: dict[str, tuple[str, str]] = {
    # India
    "bengaluru": ("India", "Bengaluru"),
    "bangalore": ("India", "Bengaluru"),
    "mumbai": ("India", "Mumbai"),
    "pune": ("India", "Pune"),
    "hyderabad": ("India", "Hyderabad"),
    "chennai": ("India", "Chennai"),
    "gurgaon": ("India", "Gurugram"),
    "gurugram": ("India", "Gurugram"),
    "noida": ("India", "Noida"),
    "new delhi": ("India", "New Delhi"),
    "delhi": ("India", "New Delhi"),
    "kolkata": ("India", "Kolkata"),
    "ahmedabad": ("India", "Ahmedabad"),
    # Singapore
    "singapore": ("Singapore", "Singapore"),
    # United Kingdom
    "london": ("United Kingdom", "London"),
    "cambridge, uk": ("United Kingdom", "Cambridge"),
    "cambridge, united kingdom": ("United Kingdom", "Cambridge"),
    "oxford": ("United Kingdom", "Oxford"),
    "manchester": ("United Kingdom", "Manchester"),
    "edinburgh": ("United Kingdom", "Edinburgh"),
    "bristol": ("United Kingdom", "Bristol"),
    "glasgow": ("United Kingdom", "Glasgow"),
    "leeds": ("United Kingdom", "Leeds"),
    "belfast": ("United Kingdom", "Belfast"),
    # Hong Kong
    "hong kong": ("Hong Kong", "Hong Kong"),
    "hongkong": ("Hong Kong", "Hong Kong"),
}

_COUNTRIES: dict[str, str] = {
    "india": "India",
    "singapore": "Singapore",
    "united kingdom": "United Kingdom",
    "uk": "United Kingdom",
    "england": "United Kingdom",
    "scotland": "United Kingdom",
    "great britain": "United Kingdom",
    "hong kong": "Hong Kong",
}

_REMOTE = re.compile(r"\bremote\b", re.I)
_HYBRID = re.compile(r"\bhybrid\b", re.I)
_ONSITE = re.compile(r"\bon[\s\-]?site\b", re.I)


def normalize_location(raw: str) -> tuple[str, str | None, str]:
    """Return (country, city, work_mode)."""
    text = raw.lower()

    if _HYBRID.search(text):
        work_mode = "hybrid"
    elif _REMOTE.search(text):
        work_mode = "remote"
    elif _ONSITE.search(text):
        work_mode = "onsite"
    else:
        work_mode = "unknown"

    for key, (country, city) in _CITIES.items():
        if key in text:
            return country, city, work_mode

    # word-boundary country match (avoids "ukraine" matching "uk")
    for key, country in _COUNTRIES.items():
        if re.search(rf"\b{re.escape(key)}\b", text):
            return country, None, work_mode

    if work_mode == "remote":
        return "Remote", None, "remote"

    return "Other", None, work_mode
