"use client";

import { useEffect, useState } from "react";

const KEY = "savedJobs";

export function getSavedIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw: unknown[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return raw.map(Number).filter((n) => Number.isInteger(n));
  } catch {
    return [];
  }
}

export default function SaveButton({ jobId: rawId }: { jobId: number }) {
  const jobId = Number(rawId); // pg returns BIGINT ids as strings
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setSaved(getSavedIds().includes(jobId));
  }, [jobId]);

  const toggle = () => {
    const ids = getSavedIds();
    const next = ids.includes(jobId)
      ? ids.filter((id) => id !== jobId)
      : [...ids, jobId];
    localStorage.setItem(KEY, JSON.stringify(next));
    setSaved(next.includes(jobId));
    window.dispatchEvent(new Event("saved-jobs-changed"));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      title={saved ? "Remove from saved" : "Save internship"}
      className={`relative z-10 shrink-0 rounded-md border px-2 py-1 text-sm ${
        saved
          ? "border-amber-300 bg-amber-50 text-amber-600"
          : "border-zinc-200 text-zinc-400 hover:border-amber-300 hover:text-amber-500"
      }`}
    >
      {saved ? "★" : "☆"}
    </button>
  );
}
