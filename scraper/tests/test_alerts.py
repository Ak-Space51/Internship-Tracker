import pytest

from scraper import alerts

TOKEN = "11111111-2222-3333-4444-555555555555"
SUB = (1, "student@example.com", [], [], [], [], TOKEN)
JOB = (10, "SWE Intern", "Acme", "India", "Bengaluru", "summer-2027", "https://x/1")


class FakeResult:
    def __init__(self, rows):
        self.rows = rows

    def fetchone(self):
        return self.rows[0] if self.rows else None

    def fetchall(self):
        return self.rows


class FakeCursor:
    def __init__(self, conn):
        self.conn = conn

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def executemany(self, sql, params_seq):
        self.conn.recorded.extend(params_seq)


class FakeConnection:
    """Mirrors the psycopg3 surface: execute() on the connection, but
    executemany() only on a cursor."""

    def __init__(self, subs=(SUB,), jobs=(JOB,)):
        self.subs = list(subs)
        self.jobs = list(jobs)
        self.recorded: list[tuple] = []
        self.commits = 0
        self.sql_seen: list[str] = []

    def execute(self, sql, params=None):
        self.sql_seen.append(sql)
        if "FROM settings" in sql:
            return FakeResult([("summer-2027",)])
        if "FROM alert_subscriptions" in sql:
            return FakeResult(self.subs)
        return FakeResult(self.jobs)

    def cursor(self):
        return FakeCursor(self)

    def commit(self):
        self.commits += 1


@pytest.fixture
def sent(monkeypatch):
    calls = []
    monkeypatch.setenv("RESEND_API_KEY", "test-key")
    monkeypatch.setattr(
        alerts, "_send", lambda client, key, to, subject, html: calls.append(to)
    )
    return calls


def test_successful_send_records_delivery(sent):
    conn = FakeConnection()
    subs, count, failed = alerts.run_alerts(conn)
    assert (subs, count, failed) == (1, 1, 0)
    assert sent == ["student@example.com"]
    assert conn.recorded == [(1, 10)]
    assert conn.commits == 1


def test_failed_send_is_counted_and_not_recorded(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "test-key")

    def boom(*_args):
        raise RuntimeError("Resend returned 403: forbidden")

    monkeypatch.setattr(alerts, "_send", boom)
    conn = FakeConnection()
    subs, count, failed = alerts.run_alerts(conn)
    assert (subs, count, failed) == (1, 0, 1)
    assert conn.recorded == []


def test_one_failure_does_not_stop_other_subscribers(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "test-key")
    second = (2, "other@example.com", [], [], [], [], TOKEN)

    def flaky(_client, _key, to, _subject, _html):
        if to == "student@example.com":
            raise RuntimeError("Resend returned 403: forbidden")

    monkeypatch.setattr(alerts, "_send", flaky)
    conn = FakeConnection(subs=(SUB, second))
    subs, count, failed = alerts.run_alerts(conn)
    assert (subs, count, failed) == (2, 1, 1)
    assert conn.recorded == [(2, 10)]


def test_dry_run_without_api_key(monkeypatch):
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    conn = FakeConnection()
    subs, count, failed = alerts.run_alerts(conn)
    assert (subs, count, failed) == (1, 1, 0)
    assert conn.recorded == []


def test_unsubscribed_subscribers_are_excluded_in_sql():
    """The opt-out is enforced in the query, so an unsubscribed row is never
    even considered for a digest."""
    conn = FakeConnection()
    alerts.run_alerts(conn)
    sub_query = next(s for s in conn.sql_seen if "FROM alert_subscriptions" in s)
    assert "unsubscribed_at IS NULL" in sub_query


def test_digest_carries_a_working_unsubscribe_link(monkeypatch):
    monkeypatch.setattr(alerts, "SITE_URL", "https://example.com")
    html = alerts._digest_html([JOB], "summer-2027", TOKEN)
    assert f"https://example.com/alerts/unsubscribe?token={TOKEN}" in html
    assert "Unsubscribe" in html


def test_digest_without_token_omits_the_link():
    html = alerts._digest_html([JOB], "summer-2027", None)
    assert "unsubscribe" not in html.lower()
