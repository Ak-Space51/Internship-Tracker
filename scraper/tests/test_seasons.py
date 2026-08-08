from datetime import date

from scraper.normalize.seasons import extract_season

TODAY = date(2026, 8, 9)


def season(title, desc=None):
    return extract_season(title, desc, today=TODAY)


def test_explicit_summer_year():
    assert season("Software Engineer Intern, Summer 2027") == ("summer-2027", "explicit", None)


def test_year_before_season():
    assert season("2027 Summer Analyst Program") == ("summer-2027", "explicit", None)


def test_apostrophe_year():
    assert season("ML Intern (Summer '27)") == ("summer-2027", "explicit", None)


def test_autumn_maps_to_fall():
    assert season("Intern - Autumn 2026")[0] == "fall-2026"


def test_winter():
    assert season("Winter 2026 Software Intern")[0] == "winter-2026"


def test_season_in_description_only():
    s, conf, _ = season("Software Engineering Intern", "Join us for Summer 2027 in Bengaluru.")
    assert (s, conf) == ("summer-2027", "explicit")


def test_off_cycle():
    assert season("Off-Cycle Intern, Trading")[:2] == ("off-cycle", "explicit")


def test_duration_only_is_off_cycle():
    s, conf, dur = season("Software Intern", "This is a 6 month internship in Singapore.")
    assert (s, conf, dur) == ("off-cycle", "inferred", 6)


def test_duration_extracted_alongside_explicit_season():
    s, _, dur = season("Intern Summer 2027", "A 3-month internship.")
    assert (s, dur) == ("summer-2027", 3)


def test_bare_year_infers_summer():
    assert season("Software Engineer Intern 2027") == ("summer-2027", "inferred", None)


def test_bare_year_too_far_ignored():
    s, conf, _ = season("Intern 2035")
    assert conf != "explicit" and s != "summer-2035"


def test_grad_year_maps_to_summer():
    s, conf, _ = season("SWE Intern", "Open to students graduating in 2027 or 2028.")
    assert (s, conf) == ("summer-2027", "inferred")


def test_class_of():
    s, conf, _ = season("Quant Intern", "You are in the Class of 2028.")
    assert (s, conf) == ("summer-2028", "inferred")


def test_season_word_no_year_rolls_forward():
    # August 2026: "Summer Intern" must mean Summer 2027
    assert season("Summer Intern - Backend")[0] == "summer-2027"


def test_season_word_no_year_before_season_start():
    # February 2026: "Summer Intern" means Summer 2026
    assert extract_season("Summer Intern", today=date(2026, 2, 1))[0] == "summer-2026"


def test_nothing_found():
    assert season("Software Engineer Intern") == ("unknown", "unknown", None)


def test_duration_sanity_bounds():
    _, _, dur = season("Intern", "a 99 month internship")
    assert dur is None
