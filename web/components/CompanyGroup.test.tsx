import { StrictMode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CompanyGroup as Group, JobRow } from "@/lib/db";

function job(n: number): JobRow {
  return {
    id: n,
    title: `Intern Role ${n}`,
    company_name: "Acme",
    company_slug: "acme",
    country: "India",
    city: "Bengaluru",
    work_mode: "onsite",
    role_category: "software",
    role: "Backend",
    season: "summer-2027",
    season_confidence: "explicit",
    duration_months: 6,
    comp_min: null,
    comp_max: null,
    comp_currency: null,
    comp_period: null,
    application_url: "https://example.com/apply",
    posted_at: "2026-08-01T00:00:00.000Z",
    first_seen_at: "2026-08-01T00:00:00.000Z",
  };
}

const group: Group = {
  company_name: "Acme",
  company_slug: "acme",
  jobs: Array.from({ length: 20 }, (_, i) => job(i + 1)),
};

async function renderGroup({ strict = false } = {}) {
  vi.resetModules();
  const { default: CompanyGroup } = await import("@/components/CompanyGroup");
  const tree = <CompanyGroup group={group} targetSeason="summer-2027" />;
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree);
}

const roleLinks = () => screen.queryAllByRole("link", { name: /Intern Role/ });

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("CompanyGroup collapse", () => {
  it("hides all 20 postings when the company header is clicked", async () => {
    const user = userEvent.setup();
    await renderGroup();
    expect(roleLinks().length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /Acme/ }));

    expect(roleLinks()).toHaveLength(0);
    expect(screen.queryByText(/Show \d+ more role/)).toBeNull();
  });

  // next dev double-invokes effects, which can unsubscribe a store listener
  it("still collapses under StrictMode", async () => {
    const user = userEvent.setup();
    await renderGroup({ strict: true });

    await user.click(screen.getByRole("button", { name: /Acme/ }));

    expect(roleLinks()).toHaveLength(0);
  });

  it("hides the overflow rows too, even after they were revealed", async () => {
    const user = userEvent.setup();
    await renderGroup();

    await user.click(screen.getByText(/Show 14 more roles/));
    expect(roleLinks()).toHaveLength(20);

    await user.click(screen.getByRole("button", { name: /Acme/ }));

    expect(roleLinks()).toHaveLength(0);
  });
});
