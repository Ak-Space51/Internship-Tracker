import Link from "next/link";
import { notFound } from "next/navigation";
import sanitizeHtml from "sanitize-html";
import { CompChip, SeasonBadge } from "@/components/CompanyGroup";
import { getJob, getTargetSeason } from "@/lib/db";
import { timeAgo } from "@/lib/filters";

export const dynamic = "force-dynamic";

export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const jobId = parseInt(id, 10);
  if (Number.isNaN(jobId)) notFound();

  const [job, targetSeason] = await Promise.all([
    getJob(jobId),
    getTargetSeason(),
  ]);
  if (!job) notFound();

  const description = job.description_html
    ? sanitizeHtml(job.description_html, {
        allowedTags: [
          "p", "br", "b", "strong", "i", "em", "u", "ul", "ol", "li",
          "h1", "h2", "h3", "h4", "h5", "a", "div", "span", "table",
          "thead", "tbody", "tr", "td", "th", "blockquote", "hr",
        ],
        allowedAttributes: { a: ["href"] },
      })
    : null;

  const location =
    job.city && job.country && job.city !== job.country
      ? `${job.city}, ${job.country}`
      : (job.country ?? job.raw_location ?? "");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
        ← All internships
      </Link>

      <header className="mt-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{job.company_name}</p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{job.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
          {location && <span>{location}</span>}
          {job.work_mode !== "unknown" && (
            <span className="capitalize">{job.work_mode}</span>
          )}
          {job.duration_months && <span>{job.duration_months} months</span>}
          <span>Posted {timeAgo(job.posted_at ?? job.first_seen_at)}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <SeasonBadge season={job.season} targetSeason={targetSeason} />
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {job.role_category}
          </span>
          {job.role && job.role !== job.role_category && (
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {job.role}
            </span>
          )}
          <CompChip job={job} />
        </div>
        <a
          href={job.application_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-block rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Apply now ↗
        </a>
      </header>

      {description ? (
        <article
          className="prose-job mt-6 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
          dangerouslySetInnerHTML={{ __html: description }}
        />
      ) : (
        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
          No description available — see the full posting on the company site.
        </p>
      )}

      <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <a
          href={job.application_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Apply at {job.company_name} ↗
        </a>
      </div>
    </div>
  );
}
