from scraper.normalize.intern_filter import is_internship


def test_basic_intern_titles():
    for title in [
        "Software Engineer Intern",
        "Internship - Data Science",
        "Machine Learning Intern, Summer 2027",
        "Software Engineering Co-op",
        "Industrial Placement Student",
        "Summer Analyst, Markets",
        "Off-cycle Analyst",
    ]:
        assert is_internship(title), title


def test_non_intern_titles_rejected():
    for title in [
        "Internal Tools Engineer",
        "International Sales Manager",
        "Senior Software Engineer",
        "Engineering Manager, Internal Platform",
        "Staff Engineer",
    ]:
        assert not is_internship(title), title
