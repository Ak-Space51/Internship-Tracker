"use client";

import {
  STATUSES,
  STATUS_LABELS,
  setStatus,
  useTracker,
  type Status,
} from "@/lib/tracker";

const TONE: Record<Status, string> = {
  saved: "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400",
  applied: "border-blue-300 text-blue-700 dark:border-blue-800 dark:text-blue-400",
  oa: "border-violet-300 text-violet-700 dark:border-violet-800 dark:text-violet-400",
  interview:
    "border-indigo-300 text-indigo-700 dark:border-indigo-800 dark:text-indigo-400",
  offer:
    "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400",
  rejected: "border-zinc-300 text-zinc-500 dark:border-zinc-700 dark:text-zinc-500",
};

/** Compact status control — one dropdown rather than six buttons, so it fits
 * inside a dense job row without dominating it. */
export default function StatusSelect({ jobId }: { jobId: number | string }) {
  const entry = useTracker()[String(jobId)];
  const current = entry?.status;

  return (
    <select
      value={current ?? ""}
      onChange={(e) =>
        setStatus(jobId, e.target.value === "" ? null : (e.target.value as Status))
      }
      onClick={(e) => e.stopPropagation()}
      aria-label="Application status"
      className={`relative z-10 shrink-0 rounded-md border bg-white px-1.5 py-1 text-xs font-medium dark:bg-zinc-900 ${
        current
          ? TONE[current]
          : "border-zinc-200 text-zinc-400 dark:border-zinc-700 dark:text-zinc-500"
      }`}
    >
      <option value="">— Track</option>
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
