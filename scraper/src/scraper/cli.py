from __future__ import annotations

import argparse

from scraper import db, pipeline


def cmd_ingest(args: argparse.Namespace) -> None:
    summary = pipeline.ingest(only_slug=args.company)
    for r in summary.ok:
        print(f"  {r.slug:<24} fetched={r.fetched:<5} internships={r.internships:<4} closed={r.closed}")
    for r in summary.failed:
        print(f"  {r.slug:<24} ERROR {r.error}")
    total = sum(r.internships for r in summary.ok)
    print(f"\n{len(summary.ok)} boards ok, {len(summary.failed)} failed, {total} internships upserted")


def cmd_classify(args: argparse.Namespace) -> None:
    from scraper.llm import classify_pending

    with db.connect() as conn:
        attempted, updated = classify_pending(conn, limit=args.limit)
    if attempted == 0:
        print("nothing to classify — all unresolved jobs already checked")
    else:
        print(f"classified {attempted} jobs, {updated} updated")


def cmd_migrate(_: argparse.Namespace) -> None:
    """Apply unapplied SQL migrations against DATABASE_URL (no psql needed)."""
    from pathlib import Path

    migrations = Path(__file__).resolve().parents[3] / "database" / "migrations"
    with db.connect() as conn:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_migrations ("
            "filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())"
        )
        applied = {
            r[0] for r in conn.execute("SELECT filename FROM schema_migrations").fetchall()
        }
        for path in sorted(migrations.glob("*.sql")):
            if path.name in applied:
                print(f"skip   {path.name}")
                continue
            print(f"apply  {path.name}")
            conn.execute(path.read_text())
            conn.execute(
                "INSERT INTO schema_migrations (filename) VALUES (%s)", (path.name,)
            )
        conn.commit()
    print("migrations up to date")


def cmd_alerts(_: argparse.Namespace) -> None:
    import os
    import sys

    from scraper.alerts import run_alerts

    with db.connect() as conn:
        subs, sent, failed = run_alerts(conn)
    # In Actions an unset secret expands to "", so check the value, not the key
    mode = "sent" if os.environ.get("RESEND_API_KEY") else "printed (dry run)"
    print(f"{subs} subscriptions, {sent} digests {mode}, {failed} failed")
    if failed:
        sys.exit(1)


def cmd_stats(_: argparse.Namespace) -> None:
    with db.connect() as conn:
        active = conn.execute("SELECT count(*) FROM jobs WHERE is_active").fetchone()[0]
        print(f"active internships: {active}\n")
        for label, col in [("season", "season"), ("country", "country"), ("role", "role_category")]:
            rows = conn.execute(
                f"SELECT {col}, count(*) FROM jobs WHERE is_active GROUP BY 1 ORDER BY 2 DESC"
            ).fetchall()
            print(f"by {label}:")
            for value, count in rows:
                print(f"  {value or '—':<20} {count}")
            print()


def main() -> None:
    parser = argparse.ArgumentParser(prog="scraper")
    sub = parser.add_subparsers(dest="command", required=True)

    p_ingest = sub.add_parser("ingest", help="fetch all boards and upsert internships")
    p_ingest.add_argument("--company", help="only this registry slug")
    p_ingest.set_defaults(func=cmd_ingest)

    p_classify = sub.add_parser(
        "classify", help="LLM fallback for season/role the rules couldn't place"
    )
    p_classify.add_argument("--limit", type=int, help="max jobs this run")
    p_classify.set_defaults(func=cmd_classify)

    p_migrate = sub.add_parser("migrate", help="apply unapplied SQL migrations")
    p_migrate.set_defaults(func=cmd_migrate)

    p_alerts = sub.add_parser("alerts", help="send new-job digests to subscribers")
    p_alerts.set_defaults(func=cmd_alerts)

    p_stats = sub.add_parser("stats", help="print active-job distribution")
    p_stats.set_defaults(func=cmd_stats)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
