"use client";

import { getEntry, setStatus, useTracker } from "@/lib/tracker";

const LEGACY_KEY = "savedJobs";

/** Reads the pre-tracker localStorage key. Still exported because lib/tracker
 * migrates from it on first load, and older bookmarks may predate the tracker. */
export function getSavedIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw: unknown[] = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? "[]");
    return raw.map(Number).filter((n) => Number.isInteger(n));
  } catch {
    return [];
  }
}

/** The ☆ is now a shortcut into the tracker: starring sets status "saved",
 * un-starring removes the job. Anything further along (applied, interview…)
 * still shows as starred, since it is by definition saved. */
export default function SaveButton({ jobId: rawId }: { jobId: number }) {
  const jobId = Number(rawId); // pg returns BIGINT ids as strings
  useTracker(); // re-render when the tracker changes elsewhere
  const tracked = !!getEntry(jobId);

  return (
    <button
      type="button"
      onClick={() => setStatus(jobId, tracked ? null : "saved")}
      aria-pressed={tracked}
      title={tracked ? "Remove from tracker" : "Save internship"}
      className={`relative z-10 shrink-0 rounded-md border px-2 py-1 text-sm ${
        tracked
          ? "border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400"
          : "border-zinc-200 text-zinc-400 hover:border-amber-300 hover:text-amber-500 dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-amber-700"
      }`}
    >
      {tracked ? "★" : "☆"}
    </button>
  );
}
