import Link from "next/link";
import CompanyCard from "@/components/CompanyCard";
import SaveButton from "@/components/SaveButton";
import type { CompanyGroup as Group, JobRow } from "@/lib/db";
import { formatComp, jobComp } from "@/lib/comp";
import { isNew, prettySeason, timeAgo } from "@/lib/filters";

const VISIBLE_ROWS = 6;

export function SeasonBadge({
  season,
  targetSeason,
}: {
  season: string;
  targetSeason: string;
}) {
  const cls =
    season === targetSeason
      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
      : season === "off-cycle"
        ? "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300"
        : season === "unknown"
          ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
          : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${cls}`}>
      {prettySeason(season)}
    </span>
  );
}

export function CompChip({ job }: { job: Parameters<typeof jobComp>[0] }) {
  const comp = jobComp(job);
  if (!comp) return null;
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-medium ${
        comp.estimated
          ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      }`}
      title={
        comp.estimated
          ? "Market estimate — the posting does not state pay"
          : "Listed in the posting"
      }
    >
      {formatComp(comp)}
    </span>
  );
}

function Row({ job, targetSeason }: { job: JobRow; targetSeason: string }) {
  const location =
    job.city && job.country && job.city !== job.country
      ? `${job.city}, ${job.country}`
      : (job.country ?? "");
  return (
    <li className="group relative flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
      <div className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <Link
            href={`/jobs/${job.id}`}
            className="text-sm font-medium text-zinc-900 group-hover:text-indigo-700 dark:text-zinc-100 dark:group-hover:text-indigo-400"
          >
            <span className="absolute inset-0" aria-hidden />
            {job.title}
          </Link>
          {isNew(job.first_seen_at) && (
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              NEW
            </span>
          )}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <SeasonBadge season={job.season} targetSeason={targetSeason} />
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {job.role ?? job.role_category}
          </span>
          <CompChip job={job} />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {[
              location,
              job.work_mode !== "unknown" ? job.work_mode : null,
              job.duration_months ? `${job.duration_months} mo` : null,
              timeAgo(job.posted_at ?? job.first_seen_at),
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
      </div>
      <span className="flex shrink-0 items-center gap-1.5">
        <a
          href={job.application_url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-10 rounded-md border border-indigo-200 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950"
        >
          Apply ↗
        </a>
        <SaveButton jobId={job.id} />
      </span>
    </li>
  );
}

export default function CompanyGroup({
  group,
  targetSeason,
}: {
  group: Group;
  targetSeason: string;
}) {
  const visible = group.jobs.slice(0, VISIBLE_ROWS);
  const hidden = group.jobs.slice(VISIBLE_ROWS);
  const seasonCount = group.jobs.filter((j) => j.season === targetSeason).length;
  return (
    <CompanyCard
      slug={group.company_slug}
      name={group.company_name}
      roleCount={group.jobs.length}
      seasonCount={seasonCount}
      seasonLabel={prettySeason(targetSeason)}
    >
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {visible.map((job) => (
          <Row key={job.id} job={job} targetSeason={targetSeason} />
        ))}
      </ul>
      {hidden.length > 0 && (
        <details>
          <summary className="cursor-pointer border-t border-zinc-100 px-4 py-2 text-xs font-medium text-indigo-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-indigo-400 dark:hover:bg-zinc-800/50">
            Show {hidden.length} more role{hidden.length === 1 ? "" : "s"}
          </summary>
          <ul className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
            {hidden.map((job) => (
              <Row key={job.id} job={job} targetSeason={targetSeason} />
            ))}
          </ul>
        </details>
      )}
    </CompanyCard>
  );
}
