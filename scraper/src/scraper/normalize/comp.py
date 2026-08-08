"""Compensation extraction from posting text.

Postings rarely state intern pay, but when they do it looks like:
    "stipend of ₹50,000 per month"      "Rs. 1,00,000/month"
    "1.5 lakh per month"                "S$1,800 monthly stipend"
    "£45,000 per annum pro rata"        "HK$20,000/month"
    "$8,500 - $11,500 per month"

To avoid matching random numbers, an amount only counts when a pay keyword
(stipend/salary/compensation/pay/remuneration) appears within 100 characters.

Returns (min, max, currency, period) or None.
"""

from __future__ import annotations

import re

Comp = tuple[float, float, str, str]

_TAG = re.compile(r"<[^>]+>")

_CURRENCIES = [
    (r"₹|rs\.?\s|inr", "INR"),
    (r"s\$|sgd", "SGD"),
    (r"£|gbp", "GBP"),
    (r"hk\$|hkd", "HKD"),
    (r"€|eur", "EUR"),
    (r"\$|usd", "USD"),  # bare $ last so S$/HK$ win
]

_AMOUNT = r"(\d{1,3}(?:[,.]\d{2,3})*(?:\.\d+)?)\s*(k|l|lakh|lacs?|lakhs?)?"
_PAY_KEYWORD = re.compile(
    r"stipend|salary|compensation|remuneration|\bpay\b|\bpaid\b|per\s+month|monthly",
    re.I,
)
_PERIODS = [
    (r"per\s+month|/\s*month|monthly|a\s+month|p\.?m\.?\b|/mo\b", "month"),
    (r"per\s+annum|per\s+year|/\s*year|annually|p\.?a\.?\b|/yr\b|ctc", "year"),
    (r"per\s+week|/\s*week|weekly", "week"),
    (r"per\s+day|/\s*day|daily", "day"),
    (r"per\s+hour|/\s*hour|hourly|/hr\b", "hour"),
]


def _to_number(raw: str, suffix: str | None) -> float:
    n = float(raw.replace(",", "")) if raw.count(".") <= 1 else float(raw.replace(".", "").replace(",", ""))
    if suffix:
        s = suffix.lower()
        if s == "k":
            n *= 1_000
        else:  # lakh variants
            n *= 100_000
    return n


def extract_compensation(description_html: str | None) -> Comp | None:
    if not description_html:
        return None
    text = _TAG.sub(" ", description_html)

    for cur_pat, cur_code in _CURRENCIES:
        pattern = re.compile(
            rf"(?:{cur_pat})\s*{_AMOUNT}(?:\s*(?:-|–|—|to)\s*(?:{cur_pat})?\s*{_AMOUNT})?",
            re.I,
        )
        for m in pattern.finditer(text):
            window = text[max(0, m.start() - 100) : m.end() + 100]
            if not _PAY_KEYWORD.search(window):
                continue

            lo = _to_number(m.group(1), m.group(2))
            hi = _to_number(m.group(3), m.group(4)) if m.group(3) else lo
            if hi < lo:
                lo, hi = hi, lo

            period = ""
            after = text[m.end() : m.end() + 60]
            for per_pat, per_name in _PERIODS:
                if re.search(per_pat, after, re.I):
                    period = per_name
                    break
            if not period:
                # "stipend of X" with no unit is almost always monthly
                period = "month" if re.search(r"stipend", window, re.I) else "year"

            # sanity: reject implausible values (e.g. "24/7 support", years)
            monthly = {"month": 1, "year": 1 / 12, "week": 4.33, "day": 21, "hour": 160}[
                period
            ] * lo
            plausible = {
                "INR": (5_000, 500_000),
                "SGD": (500, 25_000),
                "GBP": (400, 20_000),
                "HKD": (3_000, 150_000),
                "USD": (500, 30_000),
                "EUR": (400, 20_000),
            }[cur_code]
            if not (plausible[0] <= monthly <= plausible[1]):
                continue

            return lo, hi, cur_code, period
    return None
