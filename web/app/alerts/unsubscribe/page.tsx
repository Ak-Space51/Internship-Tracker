import Link from "next/link";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

/** One-click unsubscribe reached from the digest footer. No login: the token
 * is the only credential, which is the standard trade for email opt-out — the
 * worst a leaked token allows is unsubscribing that address. */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let outcome: "done" | "already" | "unknown" = "unknown";
  if (token && /^[0-9a-f-]{36}$/i.test(token)) {
    const { rows } = await pool.query(
      `UPDATE alert_subscriptions
         SET unsubscribed_at = now()
       WHERE unsubscribe_token = $1 AND unsubscribed_at IS NULL
       RETURNING email`,
      [token]
    );
    if (rows.length) {
      outcome = "done";
    } else {
      const { rows: existing } = await pool.query(
        "SELECT 1 FROM alert_subscriptions WHERE unsubscribe_token = $1",
        [token]
      );
      outcome = existing.length ? "already" : "unknown";
    }
  }

  const message = {
    done: "You've been unsubscribed. No more alert emails will be sent.",
    already: "You were already unsubscribed — nothing more to do.",
    unknown:
      "That unsubscribe link isn't valid. It may have been mistyped, or the subscription was already removed.",
  }[outcome];

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
        {outcome === "unknown" ? "Link not recognised" : "Unsubscribed"}
      </h1>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Browse internships
        </Link>
        <Link
          href="/alerts"
          className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Resubscribe
        </Link>
      </div>
    </div>
  );
}
