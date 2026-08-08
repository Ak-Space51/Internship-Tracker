"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SaveButton, { getSavedIds } from "@/components/SaveButton";
import { formatComp, jobComp } from "@/lib/comp";
import { prettySeason, timeAgo } from "@/lib/filters";
import type { JobRow } from "@/lib/db";

type SavedJob = JobRow & { is_active: boolean };

export default function SavedPage() {
  const [jobs, setJobs] = useState<SavedJob[] | null>(null);

  const load = () => {
    const ids = getSavedIds();
    if (!ids.length) {
      setJobs([]);
      return;
    }
    fetch(`/api/jobs?ids=${ids.join(",")}`)
      .then((r) => r.json())
      .then((data) => {
        const order = new Map(ids.map((id, i) => [id, i]));
        setJobs(
          data.jobs.sort(
            (a: SavedJob, b: SavedJob) =>
              (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
          )
        );
      });
  };

  useEffect(() => {
    load();
    window.addEventListener("saved-jobs-changed", load);
    return () => window.removeEventListener("saved-jobs-changed", load);
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold text-zinc-900">Saved internships</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Stored in this browser — no account needed.
      </p>

      {jobs === null ? (
        <p className="mt-8 text-sm text-zinc-500">Loading…</p>
      ) : jobs.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500">
          Nothing saved yet — hit the ☆ on any internship.
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
          {jobs.map((job) => {
            const comp = jobComp(job);
            return (
              <li
                key={job.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="text-sm font-medium text-zinc-900 hover:text-indigo-700"
                    >
                      {job.title}
                    </Link>
                    {!job.is_active && (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                        CLOSED
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {[
                      job.company_name,
                      job.city && job.city !== job.country
                        ? `${job.city}, ${job.country}`
                        : job.country,
                      prettySeason(job.season),
                      comp ? formatComp(comp) : null,
                      timeAgo(job.posted_at ?? job.first_seen_at),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={job.application_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-indigo-200 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                  >
                    Apply ↗
                  </a>
                  <SaveButton jobId={job.id} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
