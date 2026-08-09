"use client";

import { useEffect, useState } from "react";

const KEY = "trackerEntries";
const LEGACY_SAVED_KEY = "savedJobs";

export const STATUSES = [
  "saved",
  "applied",
  "oa",
  "interview",
  "offer",
  "rejected",
] as const;

export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  saved: "Saved",
  applied: "Applied",
  oa: "OA",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

export type Entry = {
  status: Status;
  priority?: 1 | 2 | 3;
  cvVersion?: string;
  notes?: string;
  updatedAt: string;
};

export type Entries = Record<string, Entry>;

/** Application state per job, keyed by job id.
 *
 * Same store shape as lib/collapse.ts — module-level state, a listener set, and
 * a subscriber hook — so there is one localStorage pattern in this codebase
 * rather than two. Deliberately browser-local: no accounts, so the export on
 * /tracker is the only backup and is treated as a first-class feature. */
let entries: Entries = {};
let loaded = false;
const listeners = new Set<() => void>();

function load(): Entries {
  if (loaded || typeof window === "undefined") return entries;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    entries = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  } catch {
    entries = {};
  }
  // Adopt stars saved before the tracker existed rather than stranding them.
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_SAVED_KEY) ?? "[]");
    if (Array.isArray(legacy)) {
      let migrated = false;
      for (const id of legacy.map(String)) {
        if (!entries[id]) {
          entries[id] = { status: "saved", updatedAt: new Date().toISOString() };
          migrated = true;
        }
      }
      if (migrated) {
        localStorage.setItem(KEY, JSON.stringify(entries));
      }
    }
  } catch {
    /* legacy key unreadable — nothing to migrate */
  }
  loaded = true;
  return entries;
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* private mode / quota — in-memory state still works for this session */
  }
  listeners.forEach((fn) => fn());
}

export function getEntry(jobId: number | string): Entry | undefined {
  return load()[String(jobId)];
}

/** Set a status, or pass null to drop the job from the tracker entirely. */
export function setStatus(jobId: number | string, status: Status | null) {
  load();
  const id = String(jobId);
  if (status === null) delete entries[id];
  else
    entries[id] = {
      ...entries[id],
      status,
      updatedAt: new Date().toISOString(),
    };
  persist();
}

export function updateEntry(
  jobId: number | string,
  patch: Partial<Omit<Entry, "updatedAt">>
) {
  load();
  const id = String(jobId);
  const current = entries[id] ?? {
    status: "saved" as Status,
    updatedAt: new Date().toISOString(),
  };
  entries[id] = { ...current, ...patch, updatedAt: new Date().toISOString() };
  persist();
}

export function replaceAll(next: Entries) {
  entries = next;
  loaded = true;
  persist();
}

/** Subscribe a component to tracker changes. */
export function useTracker(): Entries {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    load();
    fn();
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return entries;
}

/** Validate an imported blob before letting it replace real data. Returns the
 * usable entries, silently dropping malformed ones rather than failing whole. */
export function parseImport(text: string): Entries {
  const raw = JSON.parse(text);
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw.entries ?? raw)
      : {};
  const out: Entries = {};
  for (const [id, value] of Object.entries(source as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const e = value as Partial<Entry>;
    if (!e.status || !STATUSES.includes(e.status)) continue;
    out[String(id)] = {
      status: e.status,
      priority: e.priority,
      cvVersion: typeof e.cvVersion === "string" ? e.cvVersion : undefined,
      notes: typeof e.notes === "string" ? e.notes : undefined,
      updatedAt: typeof e.updatedAt === "string" ? e.updatedAt : new Date().toISOString(),
    };
  }
  return out;
}

const CSV_COLUMNS = [
  "Company",
  "Role",
  "Location",
  "Stipend",
  "Season",
  "Status",
  "Priority",
  "CV Version",
  "Notes",
  "Apply Link",
] as const;

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** CSV shaped like the Master_Internship_Tracker columns so it opens cleanly in
 * Excel and slots into the workflow this replaces. */
export function toCsv(
  rows: {
    company: string;
    title: string;
    location: string;
    stipend: string;
    season: string;
    entry: Entry;
    applyUrl: string;
  }[]
): string {
  const lines = [CSV_COLUMNS.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.company,
        r.title,
        r.location,
        r.stipend,
        r.season,
        STATUS_LABELS[r.entry.status],
        r.entry.priority ? String(r.entry.priority) : "",
        r.entry.cvVersion ?? "",
        r.entry.notes ?? "",
        r.applyUrl,
      ]
        .map((v) => csvCell(String(v ?? "")))
        .join(",")
    );
  }
  return lines.join("\n");
}
