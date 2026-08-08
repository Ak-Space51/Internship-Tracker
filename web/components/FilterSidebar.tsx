import Link from "next/link";
import type { FacetCount, Filters } from "@/lib/db";
import { prettySeason, toggleHref } from "@/lib/filters";

function FacetSection({
  title,
  dim,
  facets,
  filters,
  selected,
  labelFor = (v) => v,
}: {
  title: string;
  dim: "seasons" | "countries" | "roles" | "companies";
  facets: FacetCount[];
  filters: Filters;
  selected: string[];
  labelFor?: (value: string) => string;
}) {
  if (!facets.length) return null;
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </h3>
      <ul className="space-y-1">
        {facets.map((f) => {
          // company facet values are "slug|Name"
          const [value, label] =
            dim === "companies"
              ? [f.value.split("|")[0], f.value.split("|")[1]]
              : [f.value, labelFor(f.value)];
          const checked = selected.includes(value);
          return (
            <li key={value}>
              <Link
                href={toggleHref(filters, dim, value)}
                className={`flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-zinc-100 ${
                  checked ? "font-medium text-zinc-900" : "text-zinc-600"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm border text-[10px] ${
                      checked
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-zinc-300 bg-white"
                    }`}
                  >
                    {checked ? "✓" : ""}
                  </span>
                  {label}
                </span>
                <span className="text-xs text-zinc-400">{f.count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function FilterSidebar({
  filters,
  facets,
}: {
  filters: Filters;
  facets: Record<"seasons" | "countries" | "roles" | "companies", FacetCount[]>;
}) {
  return (
    <aside className="space-y-6">
      <FacetSection
        title="Season"
        dim="seasons"
        facets={facets.seasons}
        filters={filters}
        selected={filters.seasons}
        labelFor={prettySeason}
      />
      <FacetSection
        title="Location"
        dim="countries"
        facets={facets.countries}
        filters={filters}
        selected={filters.countries}
      />
      <FacetSection
        title="Role"
        dim="roles"
        facets={facets.roles}
        filters={filters}
        selected={filters.roles}
      />
      <FacetSection
        title="Company"
        dim="companies"
        facets={facets.companies}
        filters={filters}
        selected={filters.companies}
      />
    </aside>
  );
}
