"use client";

import { setAllCollapsed, useCollapsedCompanies } from "@/lib/collapse";

/** Collapse/expand every company currently on the page. Individual cards can
 * still be toggled afterwards — they read the same store. */
export default function CollapseControls({ slugs }: { slugs: string[] }) {
  const collapsed = useCollapsedCompanies();
  const allCollapsed = slugs.length > 0 && slugs.every((s) => collapsed.has(s));

  return (
    <button
      type="button"
      onClick={() => setAllCollapsed(slugs, !allCollapsed)}
      className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
      title={
        allCollapsed
          ? "Expand every company's roles"
          : "Collapse to company names only"
      }
    >
      {allCollapsed ? "⊞ Expand all" : "⊟ Collapse all"}
    </button>
  );
}
