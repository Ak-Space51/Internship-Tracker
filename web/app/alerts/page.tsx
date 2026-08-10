import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { pool, getTargetSeason } from "@/lib/db";
import { confirmationEmail, sendEmail } from "@/lib/email";
import { prettySeason, TARGET_COUNTRIES } from "@/lib/filters";

export const dynamic = "force-dynamic";

const ROLES = ["SWE", "AI/ML", "Data", "Quant", "Hardware", "Product", "Other"];

/** Minutes before the same address can be sent another confirmation email.
 * Without this, repeatedly submitting someone else's address mail-bombs them. */
const CONFIRM_COOLDOWN_MINUTES = 15;

/** Creates or updates a subscription, then emails a confirmation link. Nothing
 * is delivered until that link is used, so signing up an address you don't own
 * achieves nothing. */
async function subscribe(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    redirect("/alerts?state=invalid");
  }
  // Only accept values the UI actually offers — a hand-crafted POST shouldn't
  // be able to write arbitrary strings into the filter arrays.
  const countries = formData
    .getAll("country")
    .map(String)
    .filter((c) => TARGET_COUNTRIES.includes(c));
  const roles = formData
    .getAll("role")
    .map(String)
    .filter((r) => ROLES.includes(r));
  const keywords = String(formData.get("keywords") ?? "")
    .split(",")
    .map((s) => s.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 10);

  const { rows } = await pool.query(
    `INSERT INTO alert_subscriptions (email, countries, roles, keywords)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET
       countries = EXCLUDED.countries, roles = EXCLUDED.roles,
       keywords = EXCLUDED.keywords,
       -- resubscribing through this form reverses an earlier opt-out
       unsubscribed_at = NULL
     RETURNING confirm_token, confirmed_at, confirm_sent_at`,
    [email, countries, roles, keywords]
  );
  const sub = rows[0];
  revalidatePath("/alerts");

  if (sub.confirmed_at) redirect("/alerts?state=updated");

  const sentRecently =
    sub.confirm_sent_at &&
    Date.now() - new Date(sub.confirm_sent_at).getTime() <
      CONFIRM_COOLDOWN_MINUTES * 60_000;
  if (sentRecently) redirect("/alerts?state=check-email");

  const siteUrl = process.env.SITE_URL ?? "https://internship-trackerf.vercel.app";
  const confirmUrl = `${siteUrl}/alerts/confirm?token=${sub.confirm_token}`;
  const sent = await sendEmail(
    email,
    "Confirm your internship alerts",
    confirmationEmail(confirmUrl, siteUrl)
  );
  if (sent.ok) {
    await pool.query(
      "UPDATE alert_subscriptions SET confirm_sent_at = now() WHERE email = $1",
      [email]
    );
    redirect("/alerts?state=check-email");
  }
  // Local dev has no Resend key; surface the link instead of silently
  // confirming, so the opt-in step is never skipped by accident.
  redirect(
    sent.reason === "unconfigured"
      ? `/alerts?state=no-mailer&token=${sub.confirm_token}`
      : "/alerts?state=send-failed"
  );
}

const NOTICES: Record<string, { tone: "ok" | "warn"; text: string }> = {
  "check-email": {
    tone: "ok",
    text: "Almost there — check your inbox and click the confirmation link. No alerts are sent until you do.",
  },
  updated: { tone: "ok", text: "Your alert filters have been updated." },
  invalid: { tone: "warn", text: "That doesn't look like a valid email address." },
  "send-failed": {
    tone: "warn",
    text: "We couldn't send the confirmation email just now. Try again in a few minutes.",
  },
};

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; token?: string }>;
}) {
  const [targetSeason, { state, token }] = await Promise.all([
    getTargetSeason(),
    searchParams,
  ]);
  const notice = state ? NOTICES[state] : undefined;

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Email alerts</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Get a digest whenever new {prettySeason(targetSeason)} or off-cycle
        internships matching your filters appear. One email per ingest run,
        only when there is something new.
      </p>

      {notice && (
        <p
          className={`mt-4 rounded-md px-3 py-2 text-sm ${
            notice.tone === "ok"
              ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
              : "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
          }`}
        >
          {notice.text}
        </p>
      )}
      {state === "no-mailer" && token && (
        <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          No mail service configured (RESEND_API_KEY unset), so the confirmation
          email wasn&apos;t sent.{" "}
          <a className="underline" href={`/alerts/confirm?token=${token}`}>
            Open the confirmation link directly
          </a>
          .
        </p>
      )}

      <form action={subscribe} className="mt-6 space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Email
          </label>
          <input
            type="email"
            name="email"
            required
            placeholder="you@example.com"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:ring-indigo-900"
          />
        </div>

        <fieldset>
          <legend className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Locations <span className="font-normal text-zinc-400 dark:text-zinc-400">(none = all)</span>
          </legend>
          <div className="flex flex-wrap gap-3">
            {TARGET_COUNTRIES.map((c) => (
              <label key={c} className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                <input type="checkbox" name="country" value={c} className="accent-indigo-600" />
                {c}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Roles <span className="font-normal text-zinc-400 dark:text-zinc-400">(none = all)</span>
          </legend>
          <div className="flex flex-wrap gap-3">
            {ROLES.map((r) => (
              <label key={r} className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                <input type="checkbox" name="role" value={r} className="accent-indigo-600" />
                {r}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Keywords{" "}
            <span className="font-normal text-zinc-400 dark:text-zinc-400">
              (comma-separated, matched against titles — optional)
            </span>
          </label>
          <input
            type="text"
            name="keywords"
            placeholder="machine learning, LLM, backend"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:ring-indigo-900"
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Subscribe
        </button>
        <p className="text-xs text-zinc-400 dark:text-zinc-400">
          Subscribing again with the same email updates your filters.
        </p>
      </form>
    </div>
  );
}
