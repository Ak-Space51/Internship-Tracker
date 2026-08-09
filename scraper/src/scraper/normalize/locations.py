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
    # United States — the tech/finance hubs that dominate intern postings.
    "new york": ("United States", "New York"),
    "nyc": ("United States", "New York"),
    "san francisco": ("United States", "San Francisco"),
    "chicago": ("United States", "Chicago"),
    "boston": ("United States", "Boston"),
    "seattle": ("United States", "Seattle"),
    "austin": ("United States", "Austin"),
    "palo alto": ("United States", "Palo Alto"),
    "santa clara": ("United States", "Santa Clara"),
    "mountain view": ("United States", "Mountain View"),
    "sunnyvale": ("United States", "Sunnyvale"),
    "san jose": ("United States", "San Jose"),
    "los angeles": ("United States", "Los Angeles"),
    "san diego": ("United States", "San Diego"),
    "washington, d.c.": ("United States", "Washington, D.C."),
    "washington dc": ("United States", "Washington, D.C."),
    "atlanta": ("United States", "Atlanta"),
    "denver": ("United States", "Denver"),
    "dallas": ("United States", "Dallas"),
    "houston": ("United States", "Houston"),
    "philadelphia": ("United States", "Philadelphia"),
    "pittsburgh": ("United States", "Pittsburgh"),
    "boise": ("United States", "Boise"),
    "charleston": ("United States", "Charleston"),
    "portland": ("United States", "Portland"),
    "miami": ("United States", "Miami"),
    "phoenix": ("United States", "Phoenix"),
    "minneapolis": ("United States", "Minneapolis"),
    "detroit": ("United States", "Detroit"),
    "raleigh": ("United States", "Raleigh"),
    "salt lake city": ("United States", "Salt Lake City"),
    # Canada listed explicitly so "Toronto, CA" is never read as California.
    "toronto": ("Canada", "Toronto"),
    "vancouver": ("Canada", "Vancouver"),
    "montreal": ("Canada", "Montréal"),
    "montréal": ("Canada", "Montréal"),
    "ottawa": ("Canada", "Ottawa"),
    "calgary": ("Canada", "Calgary"),
    "waterloo": ("Canada", "Waterloo"),
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
    "united states": "United States",
    "usa": "United States",
    "u.s.a": "United States",
    "canada": "Canada",
}

_REMOTE = re.compile(r"\bremote\b", re.I)
_HYBRID = re.compile(r"\bhybrid\b", re.I)
_ONSITE = re.compile(r"\bon[\s\-]?site\b", re.I)

# Postal abbreviations, matched only after a comma ("Mentor, OH, US") so a bare
# word can't trigger them. Runs *after* the city and country tables above, which
# is what keeps "Bangalore, IN" as India and "Toronto, CA" as Canada rather than
# Indiana and California.
_US_STATES = (
    "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO "
    "MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC"
).split()
_US_STATE = re.compile(rf",\s*({'|'.join(_US_STATES)})\b", re.I)
_US_STATE_NAMES = re.compile(
    r"\b(california|texas|illinois|massachusetts|washington state|new jersey|"
    r"pennsylvania|georgia|colorado|arizona|ohio|michigan|virginia|maryland|"
    r"north carolina|florida|utah|oregon|minnesota)\b",
    re.I,
)


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

    # US state, only once every named city and country above has been ruled out.
    if _US_STATE.search(text) or _US_STATE_NAMES.search(text):
        return "United States", None, work_mode

    if work_mode == "remote":
        return "Remote", None, "remote"

    return "Other", None, work_mode
