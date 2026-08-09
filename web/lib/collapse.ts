"use client";

import { useEffect, useState } from "react";

const KEY = "collapsedCompanies";

/** Company slugs the user has collapsed. Kept in localStorage so a company you
 * don't care about stays collapsed across filtering, navigation and reloads —
 * and shared through a subscriber list so the collapse-all button and every
 * card stay in sync without prop drilling. */
let collapsed: Set<string> = new Set();
let loaded = false;
const listeners = new Set<() => void>();

function load(): Set<string> {
  if (loaded || typeof window === "undefined") return collapsed;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    collapsed = new Set(Array.isArray(raw) ? raw.map(String) : []);
  } catch {
    collapsed = new Set();
  }
  loaded = true;
  return collapsed;
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify([...collapsed]));
  } catch {
    /* private mode / quota — in-memory state still works for this session */
  }
  listeners.forEach((fn) => fn());
}

export function toggleCompany(slug: string) {
  load();
  if (collapsed.has(slug)) collapsed.delete(slug);
  else collapsed.add(slug);
  persist();
}

export function setAllCollapsed(slugs: string[], value: boolean) {
  load();
  if (value) slugs.forEach((s) => collapsed.add(s));
  else slugs.forEach((s) => collapsed.delete(s));
  persist();
}

/** Subscribe a component to collapse changes. Returns the current set. */
export function useCollapsedCompanies(): Set<string> {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    // Pick up localStorage on mount (server render has no access to it).
    load();
    fn();
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return collapsed;
}
