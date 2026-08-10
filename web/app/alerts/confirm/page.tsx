import Link from "next/link";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

const TOKEN_RE = /^[0-9a-f-]{36}$/i;

/** Confirmation is a POST for the same reason unsubscribe is: mail scanners
 * fetch every link in an email. If a GET confirmed the address, the scanner
 * would do it automatically and double opt-in would prove nothing. */
async function confirmSubscription(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  if (!TOKEN_RE.test(token)) redirect("/alerts/confirm?state=invalid");

  const { rows } = await pool.query(
    `UPDATE alert_subscriptions
        SET confirmed_at = now(), unsubscribed_at = NULL
      WHERE confirm_token = $1 AND confirmed_at IS NULL
      RETURNING email`,
    [token]
  );
  redirect(`/alerts/confirm?state=${rows.length ? "done" : "already"}`);
}

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; state?: string }>;
}) {
  const { token, state } = await searchParams;

  if (state) {
    const copy = {
      done: {
        heading: "Alerts confirmed",
        body: "You'll get a digest whenever new internships match your filters.",
      },
      already: {
        heading: "Already confirmed",
        body: "This address is already receiving alerts — nothing more to do.",
      },
      invalid: {
        heading: "Link not recognised",
        body: "That confirmation link isn't valid. Try subscribing again.",
      },
    }[state] ?? {
      heading: "Link not recognised",
      body: "That confirmation link isn't valid.",
    };
    return <Result heading={copy.heading} body={copy.body} />;
  }

  if (!token || !TOKEN_RE.test(token)) {
    return (
      <Result
        heading="Link not recognised"
        body="That confirmation link isn't valid. Try subscribing again."
      />
    );
  }

  // Read-only: safe for a link scanner to fetch.
  const { rows } = await pool.query(
    "SELECT email, confirmed_at FROM alert_subscriptions WHERE confirm_token = $1",
    [token]
  );
  if (!rows.length) {
    return (
      <Result
        heading="Link not recognised"
        body="That confirmation link isn't valid. Try subscribing again."
      />
    );
  }
  if (rows[0].confirmed_at) {
    return (
      <Result
        heading="Already confirmed"
        body="This address is already receiving alerts — nothing more to do."
      />
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
        Confirm your alerts
      </h1>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        Start sending internship digests to{" "}
        <span className="font-medium text-zinc-800 dark:text-zinc-200">
          {rows[0].email}
        </span>
        ?
      </p>
      <form action={confirmSubscription} className="mt-8 flex justify-center gap-3">
        <input type="hidden" name="token" value={token} />
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Yes, send me alerts
        </button>
        <Link
          href="/"
          className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          No thanks
        </Link>
      </form>
    </div>
  );
}

function Result({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
        {heading}
      </h1>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{body}</p>
      <div className="mt-8">
        <Link
          href="/"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Browse internships
        </Link>
      </div>
    </div>
  );
}
