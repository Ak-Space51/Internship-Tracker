import type { Filters } from "./db";

export const TARGET_COUNTRIES = [
  "India",
  "Singapore",
  "United Kingdom",
  "Hong Kong",
  "Remote",
];

export type SearchParams = Record<string, string | string[] | undefined>;

function list(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return (Array.isArray(v) ? v : [v]).flatMap((s) => s.split(",")).filter(Boolean);
}

/** Parse URL search params into filters, applying season-first defaults:
 * no explicit season -> target season + off-cycle + unknown;
 * no explicit country -> the four target countries + Remote. */
export function parseFilters(sp: SearchParams, targetSeason: string): Filters {
  const seasons = list(sp.season);
  const countries = list(sp.country);
  return {
    q: typeof sp.q === "string" && sp.q.trim() ? sp.q.trim() : undefined,
    seasons: seasons.length ? seasons : [targetSeason, "off-cycle", "unknown"],
    countries: countries.length ? countries : [...TARGET_COUNTRIES],
    roles: list(sp.role),
    companies: list(sp.company),
    page: Math.max(1, parseInt(String(sp.page ?? "1"), 10) || 1),
  };
}

/** Build a query string for the current filters with one facet value toggled. */
export function toggleHref(
  f: Filters,
  dim: "seasons" | "countries" | "roles" | "companies",
  value: string
): string {
  const next = {
    q: f.q,
    seasons: [...f.seasons],
    countries: [...f.countries],
    roles: [...f.roles],
    companies: [...f.companies],
  };
  const arr = next[dim];
  const i = arr.indexOf(value);
  if (i >= 0) arr.splice(i, 1);
  else arr.push(value);
  return buildHref(next);
}

export function buildHref(f: {
  q?: string;
  seasons: string[];
  countries: string[];
  roles: string[];
  companies: string[];
}): string {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  for (const s of f.seasons) params.append("season", s);
  for (const c of f.countries) params.append("country", c);
  for (const r of f.roles) params.append("role", r);
  for (const c of f.companies) params.append("company", c);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export function pageHref(sp: SearchParams, page: number): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v === undefined || k === "page") continue;
    for (const item of Array.isArray(v) ? v : [v]) params.append(k, item);
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export function prettySeason(season: string): string {
  if (season === "off-cycle") return "Off-cycle";
  if (season === "unknown") return "Season unknown";
  const m = season.match(/^(spring|summer|fall|winter)-(\d{4})$/);
  if (!m) return season;
  return `${m[1][0].toUpperCase()}${m[1].slice(1)} ${m[2]}`;
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function isNew(firstSeen: string): boolean {
  return Date.now() - new Date(firstSeen).getTime() < 48 * 3600_000;
}
