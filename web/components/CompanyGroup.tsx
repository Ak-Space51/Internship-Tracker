import Link from "next/link";
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
      ? "bg-indigo-100 text-indigo-700"
      : season === "off-cycle"
        ? "bg-teal-100 text-teal-700"
        : season === "unknown"
          ? "bg-zinc-100 text-zinc-500"
          : "bg-amber-100 text-amber-700";
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
        comp.estimated ? "bg-zinc-100 text-zinc-500" : "bg-emerald-100 text-emerald-700"
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
    <li className="group relative flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-zinc-50">
      <div className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <Link
            href={`/jobs/${job.id}`}
            className="text-sm font-medium text-zinc-900 group-hover:text-indigo-700"
          >
            <span className="absolute inset-0" aria-hidden />
            {job.title}
          </Link>
          {isNew(job.first_seen_at) && (
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
              NEW
            </span>
          )}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <SeasonBadge season={job.season} targetSeason={targetSeason} />
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-600">
            {job.role ?? job.role_category}
          </span>
          <CompChip job={job} />
          <span className="text-xs text-zinc-500">
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
      <a
        href={job.application_url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative z-10 shrink-0 rounded-md border border-indigo-200 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
      >
        Apply ↗
      </a>
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
  return (
    <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <header className="flex items-baseline justify-between border-b border-zinc-100 bg-zinc-50/60 px-4 py-2">
        <h2 className="text-sm font-semibold text-zinc-900">
          {group.company_name}
        </h2>
        <span className="text-xs text-zinc-500">
          {group.jobs.length} role{group.jobs.length === 1 ? "" : "s"}
        </span>
      </header>
      <ul className="divide-y divide-zinc-100">
        {visible.map((job) => (
          <Row key={job.id} job={job} targetSeason={targetSeason} />
        ))}
      </ul>
      {hidden.length > 0 && (
        <details>
          <summary className="cursor-pointer border-t border-zinc-100 px-4 py-2 text-xs font-medium text-indigo-600 hover:bg-zinc-50">
            Show {hidden.length} more role{hidden.length === 1 ? "" : "s"}
          </summary>
          <ul className="divide-y divide-zinc-100 border-t border-zinc-100">
            {hidden.map((job) => (
              <Row key={job.id} job={job} targetSeason={targetSeason} />
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
