import { revalidatePath } from "next/cache";
import { pool, getTargetSeason } from "@/lib/db";
import { prettySeason, TARGET_COUNTRIES } from "@/lib/filters";

export const dynamic = "force-dynamic";

const ROLES = ["SWE", "AI/ML", "Data", "Quant", "Hardware", "Product", "Other"];

async function subscribe(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
  const countries = formData.getAll("country").map(String);
  const roles = formData.getAll("role").map(String);
  const keywords = String(formData.get("keywords") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);

  await pool.query(
    `INSERT INTO alert_subscriptions (email, countries, roles, keywords)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET
       countries = EXCLUDED.countries, roles = EXCLUDED.roles,
       keywords = EXCLUDED.keywords,
       -- resubscribing through this form reverses an earlier opt-out
       unsubscribed_at = NULL`,
    [email, countries, roles, keywords]
  );
  revalidatePath("/alerts");
}

export default async function AlertsPage() {
  const targetSeason = await getTargetSeason();
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Email alerts</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Get a digest whenever new {prettySeason(targetSeason)} or off-cycle
        internships matching your filters appear. One email per ingest run,
        only when there is something new.
      </p>

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
