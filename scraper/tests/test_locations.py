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


def test_us_cities():
    assert normalize_location("San Francisco, CA")[:2] == ("United States", "San Francisco")
    assert normalize_location("New York, NY onsite") == ("United States", "New York", "onsite")
    assert normalize_location("Palo Alto, CA onsite")[:2] == ("United States", "Palo Alto")


def test_us_state_abbreviation_without_a_known_city():
    assert normalize_location("Mentor, OH, US")[0] == "United States"
    assert normalize_location("Austin, Texas, United States")[0] == "United States"


def test_ambiguous_state_codes_do_not_steal_other_countries():
    """CA is California *and* Canada; IN is Indiana *and* India. City and country
    matching must win over the postal-abbreviation fallback."""
    assert normalize_location("Bangalore, IN")[0] == "India"
    assert normalize_location("Toronto, CA")[0] == "Canada"
    assert normalize_location("Mumbai, IN")[0] == "India"


def test_non_us_two_letter_codes_are_not_us():
    for raw in ["Barcelona, ES Hybrid", "Milano, IT Hybrid", "Ho Chi Minh, VN"]:
        assert normalize_location(raw)[0] != "United States", raw


def test_unknown_location():
    assert normalize_location("Reykjavik")[0] == "Other"
