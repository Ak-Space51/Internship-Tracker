"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatComp, jobComp } from "@/lib/comp";
import { prettySeason, timeAgo } from "@/lib/filters";
import {
  STATUSES,
  STATUS_LABELS,
  parseImport,
  replaceAll,
  setStatus,
  toCsv,
  updateEntry,
  useTracker,
  type Status,
} from "@/lib/tracker";
import type { JobRow } from "@/lib/db";

type TrackedJob = JobRow & { is_active: boolean };

function download(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TrackerPage() {
  const entries = useTracker();
  const [jobs, setJobs] = useState<TrackedJob[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const ids = useMemo(() => Object.keys(entries), [entries]);
  const idKey = ids.join(",");

  useEffect(() => {
    if (!ids.length) {
      setJobs([]);
      return;
    }
    fetch(`/api/jobs?ids=${idKey}`)
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs ?? []))
      .catch(() => setJobs([]));
  }, [idKey, ids.length]);

  const byId = new Map((jobs ?? []).map((j) => [String(j.id), j]));
  const counts = Object.fromEntries(
    STATUSES.map((s) => [s, ids.filter((id) => entries[id]?.status === s).length])
  ) as Record<Status, number>;

  const exportCsv = () => {
    const rows = ids
      .map((id) => ({ id, job: byId.get(id), entry: entries[id] }))
      .filter((r) => r.job)
      .map(({ job, entry }) => {
        const comp = jobComp(job!);
        return {
          company: job!.company_name,
          title: job!.title,
          location:
            job!.city && job!.city !== job!.country
              ? `${job!.city}, ${job!.country}`
              : (job!.country ?? ""),
          stipend: comp ? formatComp(comp) : "",
          season: prettySeason(job!.season),
          entry: entry,
          applyUrl: job!.application_url,
        };
      });
    download("internship-tracker.csv", toCsv(rows), "text/csv");
  };

  const exportJson = () =>
    download(
      "internship-tracker.json",
      JSON.stringify({ version: 1, entries }, null, 2),
      "application/json"
    );

  const importJson = async (file: File) => {
    try {
      const parsed = parseImport(await file.text());
      const n = Object.keys(parsed).length;
      if (!n) {
        setNotice("That file had no valid tracker entries — nothing changed.");
        return;
      }
      replaceAll(parsed);
      setNotice(`Imported ${n} tracked internship${n === 1 ? "" : "s"}.`);
    } catch {
      setNotice("Couldn't read that file — expected the exported JSON.");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            My internships
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Stored in this browser only — export regularly so you don&apos;t lose
            it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportCsv}
            className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Export CSV
          </button>
          <button
            onClick={exportJson}
            className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Export JSON
          </button>
          <button
            onClick={() => fileInput.current?.click()}
            className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Import
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importJson(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {notice && (
        <p className="mt-3 rounded-md bg-indigo-50 px-3 py-2 text-sm text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          {notice}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-y border-zinc-200 py-3 dark:border-zinc-800">
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {ids.length} tracked
        </span>
        {STATUSES.map((s) => (
          <span key={s} className="text-sm text-zinc-500 dark:text-zinc-400">
            {STATUS_LABELS[s]}{" "}
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {counts[s]}
            </span>
          </span>
        ))}
      </div>

      {jobs === null ? (
        <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
      ) : ids.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Nothing tracked yet — hit ☆ or set a status on any internship.
          <div className="mt-3">
            <Link href="/" className="text-indigo-600 hover:underline dark:text-indigo-400">
              Browse internships
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {STATUSES.filter((s) => counts[s] > 0).map((status) => (
            <section key={status}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {STATUS_LABELS[status]} · {counts[status]}
              </h2>
              <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                {ids
                  .filter((id) => entries[id]?.status === status)
                  .map((id) => {
                    const job = byId.get(id);
                    const entry = entries[id];
                    if (!job) {
                      return (
                        <li key={id} className="px-4 py-3 text-sm text-zinc-400">
                          Job #{id} is no longer listed.{" "}
                          <button
                            onClick={() => setStatus(id, null)}
                            className="text-indigo-600 hover:underline dark:text-indigo-400"
                          >
                            Remove
                          </button>
                        </li>
                      );
                    }
                    const comp = jobComp(job);
                    return (
                      <li key={id} className="px-4 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              href={`/jobs/${job.id}`}
                              className="text-sm font-medium text-zinc-900 hover:text-indigo-700 dark:text-zinc-100 dark:hover:text-indigo-400"
                            >
                              {job.title}
                            </Link>
                            {!job.is_active && (
                              <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-950 dark:text-red-400">
                                CLOSED
                              </span>
                            )}
                            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
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
                            <select
                              value={entry.status}
                              onChange={(e) =>
                                setStatus(id, e.target.value as Status)
                              }
                              className="rounded-md border border-zinc-300 bg-white px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                            >
                              {STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {STATUS_LABELS[s]}
                                </option>
                              ))}
                            </select>
                            <a
                              href={job.application_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-md border border-indigo-200 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950"
                            >
                              Apply ↗
                            </a>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <select
                            value={entry.priority ?? ""}
                            onChange={(e) =>
                              updateEntry(id, {
                                priority: e.target.value
                                  ? (Number(e.target.value) as 1 | 2 | 3)
                                  : undefined,
                              })
                            }
                            aria-label="Priority"
                            className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                          >
                            <option value="">Priority —</option>
                            <option value="1">P1</option>
                            <option value="2">P2</option>
                            <option value="3">P3</option>
                          </select>
                          <input
                            defaultValue={entry.cvVersion ?? ""}
                            onBlur={(e) =>
                              updateEntry(id, { cvVersion: e.target.value || undefined })
                            }
                            placeholder="CV version"
                            className="w-32 rounded border border-zinc-200 bg-white px-2 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                          />
                          <input
                            defaultValue={entry.notes ?? ""}
                            onBlur={(e) =>
                              updateEntry(id, { notes: e.target.value || undefined })
                            }
                            placeholder="Notes"
                            className="min-w-0 flex-1 rounded border border-zinc-200 bg-white px-2 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                          />
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
