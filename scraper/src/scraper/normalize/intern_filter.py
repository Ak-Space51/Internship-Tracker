"""Decide whether a posting is an internship, from its title.

Word-boundary matching keeps "Internal Tools Engineer" and
"International Sales" out.
"""

from __future__ import annotations

import re

_INTERN = re.compile(
    r"\b(intern|interns|internship|internships|co-?op|industrial\s+placement|"
    r"placement\s+(?:student|year)|summer\s+analyst|off-?cycle\s+analyst|"
    r"spring\s+week|working\s+student)\b",
    re.I,
)

# Titles that match above but are not internships.
_EXCLUDE = re.compile(
    r"\b(internal|international|internist|co-?op(?:erative)?\s+(?:board|bank))\b", re.I
)


def is_internship(title: str) -> bool:
    cleaned = _EXCLUDE.sub(" ", title)
    return bool(_INTERN.search(cleaned))
