from scraper.normalize.locations import normalize_location


def test_simple_countries():
    assert normalize_location("Singapore") == ("Singapore", "Singapore", "unknown")
    assert normalize_location("Hong Kong") == ("Hong Kong", "Hong Kong", "unknown")


def test_indian_cities():
    assert normalize_location("Bengaluru, Karnataka, India") == ("India", "Bengaluru", "unknown")
    assert normalize_location("Bangalore") == ("India", "Bengaluru", "unknown")
    assert normalize_location("Gurgaon, India") == ("India", "Gurugram", "unknown")


def test_uk_variants():
    assert normalize_location("London, UK")[0] == "United Kingdom"
    assert normalize_location("London, England, United Kingdom") == (
        "United Kingdom", "London", "unknown",
    )


def test_work_modes():
    assert normalize_location("Singapore - Hybrid")[2] == "hybrid"
    assert normalize_location("Remote - India") == ("India", None, "remote")
    assert normalize_location("Remote") == ("Remote", None, "remote")


def test_uk_word_boundary_not_ukraine():
    country, _, _ = normalize_location("Kyiv, Ukraine")
    assert country == "Other"


def test_unknown_location():
    assert normalize_location("San Francisco, CA")[0] == "Other"
