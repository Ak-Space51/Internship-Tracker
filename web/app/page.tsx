import Link from "next/link";
import CollapseControls from "@/components/CollapseControls";
import CompanyGroup from "@/components/CompanyGroup";
import FilterSidebar from "@/components/FilterSidebar";
import { getFacets, getGroupedJobs, getTargetSeason, PAGE_SIZE } from "@/lib/db";
import {
  parseFilters,
  pageHref,
  prettySeason,
  type SearchParams,
} from "@/lib/filters";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const targetSeason = await getTargetSeason();
  const filters = parseFilters(sp, targetSeason);
  const [{ groups, totalJobs, totalCompanies }, facets] = await Promise.all([
    getGroupedJobs(filters, targetSeason),
    getFacets(filters),
  ]);
  const pages = Math.max(1, Math.ceil(totalCompanies / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6">
        <form action="/" method="get" className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Search internships, companies, cities…"
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:ring-indigo-900"
          />
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Search
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
        <FilterSidebar filters={filters} facets={facets} />

        <main>
          <div className="mb-3 flex items-baseline justify-between">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {totalJobs}
              </span>{" "}
              internship{totalJobs === 1 ? "" : "s"} at{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {totalCompanies}
              </span>{" "}
              compan{totalCompanies === 1 ? "y" : "ies"}
              {filters.q && (
                <>
                  {" "}
                  matching “<span className="font-medium">{filters.q}</span>”
                </>
              )}
            </p>
            <span className="flex items-center gap-3">
              {(filters.q ||
                filters.roles.length > 0 ||
                filters.companies.length > 0) && (
                <Link
                  href="/"
                  className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Clear filters
                </Link>
              )}
              <CollapseControls slugs={groups.map((g) => g.company_slug)} />
            </span>
          </div>

          {groups.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              No internships match these filters. Try widening the season or
              location selection.
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <CompanyGroup
                  key={group.company_slug}
                  group={group}
                  targetSeason={targetSeason}
                />
              ))}
            </div>
          )}

          {pages > 1 && (
            <nav className="mt-6 flex items-center justify-center gap-2 text-sm">
              {filters.page > 1 && (
                <Link
                  href={pageHref(sp, filters.page - 1)}
                  className="rounded border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  ← Prev
                </Link>
              )}
              <span className="px-2 text-zinc-500 dark:text-zinc-400">
                Page {filters.page} of {pages}
              </span>
              {filters.page < pages && (
                <Link
                  href={pageHref(sp, filters.page + 1)}
                  className="rounded border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  Next →
                </Link>
              )}
            </nav>
          )}
        </main>
      </div>
    </div>
  );
}

export async function generateMetadata() {
  const targetSeason = await getTargetSeason();
  return {
    title: `TrackInternships — ${prettySeason(targetSeason)} internships`,
    description: `Every open ${prettySeason(targetSeason)} internship in India, Singapore, UK and Hong Kong, from 50+ company career boards.`,
  };
}
