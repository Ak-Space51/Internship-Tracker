"use client";

import type { ReactNode } from "react";
import { toggleCompany, useCollapsedCompanies } from "@/lib/collapse";

/** Collapsible shell around a company's roles.
 *
 * Deliberately controlled React state rather than a native <details open>:
 * a hardcoded `open` attribute in JSX gets reset to its default on every
 * re-render, so a group the user collapsed would silently pop back open. */
export default function CompanyCard({
  slug,
  name,
  roleCount,
  seasonCount,
  seasonLabel,
  children,
}: {
  slug: string;
  name: string;
  roleCount: number;
  seasonCount: number;
  seasonLabel: string;
  children: ReactNode;
}) {
  const collapsed = useCollapsedCompanies().has(slug);

  return (
    <section
      data-company={slug}
      className="overflow-hidden rounded-lg border border-zinc-200 bg-white"
    >
      <h2>
        <button
          type="button"
          onClick={() => toggleCompany(slug)}
          aria-expanded={!collapsed}
          className="flex w-full items-baseline justify-between border-b border-zinc-100 bg-zinc-50/60 px-4 py-2 text-left hover:bg-zinc-100/70"
        >
          <span className="flex items-baseline gap-2 text-sm font-semibold text-zinc-900">
            <span
              aria-hidden
              className={`text-zinc-400 transition-transform ${
                collapsed ? "" : "rotate-90"
              }`}
            >
              ›
            </span>
            {name}
          </span>
          <span className="text-xs text-zinc-500">
            {seasonCount > 0 && (
              <span className="text-indigo-600">
                {seasonCount} {seasonLabel} ·{" "}
              </span>
            )}
            {roleCount} role{roleCount === 1 ? "" : "s"}
          </span>
        </button>
      </h2>
      {!collapsed && children}
    </section>
  );
}
