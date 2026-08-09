"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

export const THEME_KEY = "theme";

/** Chosen theme, shared through a subscriber list so the toggle and any other
 * reader stay in sync. "system" follows the OS and is the default, so the site
 * matches the rest of the user's desktop until they say otherwise.
 *
 * The class itself is first applied by the inline script in the root layout,
 * before paint — this module only keeps it in sync afterwards. */
let theme: Theme = "system";
let loaded = false;
const listeners = new Set<() => void>();

function prefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function resolveTheme(value: Theme): "light" | "dark" {
  if (value === "system") return prefersDark() ? "dark" : "light";
  return value;
}

function load(): Theme {
  if (loaded || typeof window === "undefined") return theme;
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    theme = stored;
  }
  loaded = true;
  return theme;
}

function apply(): void {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  // Keeps native controls and scrollbars in step with the palette.
  document.documentElement.style.colorScheme = resolved;
}

export function setTheme(next: Theme): void {
  load();
  theme = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* private mode / quota — in-memory state still works for this session */
  }
  apply();
  listeners.forEach((fn) => fn());
}

/** Three-state cycle, so "follow the OS" stays reachable without a menu.
 * Ordering is relative to the OS rather than fixed, so that the first click
 * always flips what is actually on screen — with a fixed light -> dark -> system
 * order, a click could otherwise appear to do nothing. */
export function cycleTheme(): void {
  const current = load();
  const system = resolveTheme("system");
  if (current === "system") {
    setTheme(system === "dark" ? "light" : "dark");
  } else if (current === system) {
    // Already matching the OS, so hand control back to it.
    setTheme("system");
  } else {
    setTheme(current === "dark" ? "light" : "dark");
  }
}

/** Subscribe to theme changes. Returns the stored preference and what it
 * currently resolves to. */
export function useTheme(): { theme: Theme; resolved: "light" | "dark" } {
  const [, force] = useState(0);

  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    load();
    // The inline script in the layout has normally done this already; repeating
    // it keeps the class correct if that script was skipped or the stored value
    // changed in another tab.
    apply();
    fn();

    if (typeof window.matchMedia !== "function") {
      return () => {
        listeners.delete(fn);
      };
    }
    // While on "system", track the OS flipping at sunset.
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (theme === "system") {
        apply();
        fn();
      }
    };
    query.addEventListener("change", onSystemChange);
    return () => {
      listeners.delete(fn);
      query.removeEventListener("change", onSystemChange);
    };
  }, []);

  return { theme, resolved: resolveTheme(theme) };
}
