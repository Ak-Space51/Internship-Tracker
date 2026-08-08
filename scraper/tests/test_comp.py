from scraper.normalize.comp import extract_compensation


def test_inr_stipend_per_month():
    assert extract_compensation("<p>We offer a stipend of ₹50,000 per month.</p>") == (
        50_000, 50_000, "INR", "month",
    )


def test_indian_grouping_and_rs():
    assert extract_compensation("<p>Monthly stipend: Rs. 1,00,000</p>") == (
        100_000, 100_000, "INR", "month",
    )


def test_lakh():
    lo, hi, cur, per = extract_compensation("<p>Stipend of ₹1.2 lakh per month</p>")
    assert (lo, hi, cur, per) == (120_000.0, 120_000.0, "INR", "month")


def test_sgd():
    assert extract_compensation("<p>A monthly stipend of S$1,800 is provided.</p>") == (
        1_800, 1_800, "SGD", "month",
    )


def test_gbp_annual():
    assert extract_compensation("<p>Salary: £45,000 per annum (pro rata)</p>") == (
        45_000, 45_000, "GBP", "year",
    )


def test_hkd():
    assert extract_compensation("<p>Compensation of HK$20,000/month</p>") == (
        20_000, 20_000, "HKD", "month",
    )


def test_usd_range():
    assert extract_compensation(
        "<p>The monthly salary range is $8,500 - $11,500 per month.</p>"
    ) == (8_500, 11_500, "USD", "month")


def test_stipend_defaults_to_month():
    assert extract_compensation("<p>Stipend: ₹60,000</p>") == (
        60_000, 60_000, "INR", "month",
    )


def test_no_pay_keyword_no_match():
    assert extract_compensation("<p>Founded in 2010, we saved clients $50,000.</p>") is None


def test_implausible_rejected():
    # ₹100/month is not a real stipend
    assert extract_compensation("<p>stipend of ₹100 per month</p>") is None


def test_none_input():
    assert extract_compensation(None) is None
