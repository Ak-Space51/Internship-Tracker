"""Title -> (role_category, role) via ordered keyword rules.

Specific categories (Quant, AI/ML, Data, Hardware) are checked before the
generic SWE rules so "Machine Learning Engineer Intern" lands in AI/ML,
not SWE. First match wins.
"""

from __future__ import annotations

import re

# (pattern, role_category, role) — order matters.
_RULES: list[tuple[re.Pattern[str], str, str | None]] = [
    (re.compile(r"quant(itative)?.*(research|analyst)|research.*quant", re.I), "Quant", "Quant Research"),
    (re.compile(r"quant(itative)?.*(trad|execution)|trad(er|ing).*quant", re.I), "Quant", "Quant Trading"),
    (re.compile(r"quant(itative)?.*(dev|engineer)", re.I), "Quant", "Quant Developer"),
    (re.compile(r"\bquant\b|quantitative", re.I), "Quant", None),
    (re.compile(r"\btrad(er|ing)\b", re.I), "Quant", "Trading"),

    (re.compile(r"\bnlp\b|natural language", re.I), "AI/ML", "NLP"),
    (re.compile(r"computer vision|\bcv engineer\b", re.I), "AI/ML", "Computer Vision"),
    (re.compile(r"\bllm\b|large language|gen(erative)?\s*ai", re.I), "AI/ML", "Generative AI"),
    (re.compile(r"deep learning", re.I), "AI/ML", "Deep Learning"),
    (re.compile(r"research (scientist|engineer|intern)|applied scientist", re.I), "AI/ML", "AI Research"),
    (re.compile(r"machine learning|\bml\b|\bai\b|artificial intelligence", re.I), "AI/ML", "Machine Learning"),

    (re.compile(r"data engineer", re.I), "Data", "Data Engineering"),
    (re.compile(r"data scien", re.I), "Data", "Data Science"),
    (re.compile(r"analytics|data analyst|business intelligence", re.I), "Data", "Analytics"),

    (re.compile(r"hardware|\basic\b|\bfpga\b|silicon|\bvlsi\b|chip design", re.I), "Hardware", "Hardware"),
    (re.compile(r"electrical engineer", re.I), "Hardware", "Electrical"),

    (re.compile(r"security|appsec|infosec", re.I), "SWE", "Security"),
    (re.compile(r"embedded|firmware", re.I), "SWE", "Embedded"),
    (re.compile(r"\bmobile\b|\bios\b|\bandroid\b", re.I), "SWE", "Mobile"),
    (re.compile(r"front[\s\-]?end|\breact\b|\bui engineer\b", re.I), "SWE", "Frontend"),
    (re.compile(r"back[\s\-]?end", re.I), "SWE", "Backend"),
    (re.compile(r"full[\s\-]?stack", re.I), "SWE", "Full Stack"),
    (re.compile(r"infra(structure)?|platform|devops|\bsre\b|site reliability|cloud", re.I), "SWE", "Infrastructure"),
    (re.compile(r"distributed systems", re.I), "SWE", "Distributed Systems"),
    (re.compile(r"software|\bswe\b|\bsde\b|developer|engineer", re.I), "SWE", "Software Engineering"),

    (re.compile(r"product manage|product intern|\bapm\b", re.I), "Product", "Product"),
    (re.compile(r"design(er)?\b|\bux\b|\bui\b", re.I), "Other", "Design"),
    (re.compile(r"finance|accounting|treasury", re.I), "Other", "Finance"),
]


def classify_role(title: str) -> tuple[str, str | None]:
    for pattern, category, role in _RULES:
        if pattern.search(title):
            return category, role
    return "Other", None
