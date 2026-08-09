"use client";

import { useEffect, useState } from "react";

const KEY = "groupsCollapsed";

export function readCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "1";
}

function apply(collapsed: boolean) {
  document.querySelectorAll<HTMLDetailsElement>("details[data-company]").forEach(
    (el) => {
      el.open = !collapsed;
    }
  );
}

/** Global "collapse all / expand all" switch. Individual groups can still be
 * toggled afterwards; this just sets them all at once and remembers the
 * default for the next page load. */
export default function CollapseControls() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const initial = readCollapsed();
    setCollapsed(initial);
    apply(initial);
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(KEY, next ? "1" : "0");
    apply(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
      title={
        collapsed
          ? "Expand every company's roles"
          : "Collapse to company names only"
      }
    >
      {collapsed ? "⊞ Expand all" : "⊟ Collapse all"}
    </button>
  );
}
