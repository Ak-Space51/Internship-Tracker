from scraper.normalize.roles import classify_role


def test_ml_before_generic_swe():
    assert classify_role("Machine Learning Engineer Intern") == ("AI/ML", "Machine Learning")


def test_quant_before_ml():
    assert classify_role("Quantitative Research Intern")[0] == "Quant"


def test_llm():
    assert classify_role("Research Intern - Large Language Models") == ("AI/ML", "Generative AI")


def test_swe_subroles():
    assert classify_role("Backend Engineer Intern") == ("SWE", "Backend")
    assert classify_role("iOS Intern") == ("SWE", "Mobile")
    assert classify_role("Site Reliability Engineer Intern") == ("SWE", "Infrastructure")
    assert classify_role("Security Engineering Intern") == ("SWE", "Security")


def test_generic_swe():
    assert classify_role("Software Engineer Intern") == ("SWE", "Software Engineering")


def test_data():
    assert classify_role("Data Science Intern") == ("Data", "Data Science")
    assert classify_role("Data Engineering Intern") == ("Data", "Data Engineering")


def test_hardware():
    assert classify_role("FPGA Engineer Intern")[0] == "Hardware"


def test_product_and_fallback():
    assert classify_role("Product Management Intern")[0] == "Product"
    assert classify_role("Legal Intern") == ("Other", None)
