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

    p_stats = sub.add_parser("stats", help="print active-job distribution")
    p_stats.set_defaults(func=cmd_stats)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
