import { beforeEach, describe, expect, it, vi } from "vitest";

/** The tracker store is a module singleton, so each test loads a fresh copy. */
async function load() {
  vi.resetModules();
  return import("@/lib/tracker");
}

beforeEach(() => {
  localStorage.clear();
});

describe("legacy migration", () => {
  it("adopts pre-tracker starred jobs as status 'saved'", async () => {
    localStorage.setItem("savedJobs", JSON.stringify([11, 22]));
    const t = await load();
    expect(t.getEntry(11)?.status).toBe("saved");
    expect(t.getEntry(22)?.status).toBe("saved");
  });

  it("does not clobber a richer status with the legacy save", async () => {
    localStorage.setItem("savedJobs", JSON.stringify([11]));
    localStorage.setItem(
      "trackerEntries",
      JSON.stringify({ "11": { status: "interview", updatedAt: "x" } })
    );
    const t = await load();
    expect(t.getEntry(11)?.status).toBe("interview");
  });

  it("survives an unparseable legacy key", async () => {
    localStorage.setItem("savedJobs", "not json");
    const t = await load();
    expect(t.getEntry(1)).toBeUndefined();
  });
});

describe("status changes", () => {
  it("persists across a reload of the module", async () => {
    const t = await load();
    t.setStatus(7, "applied");
    const reloaded = await load();
    expect(reloaded.getEntry(7)?.status).toBe("applied");
  });

  it("removes the job when status is set to null", async () => {
    const t = await load();
    t.setStatus(7, "applied");
    t.setStatus(7, null);
    expect(t.getEntry(7)).toBeUndefined();
  });

  it("keeps notes, priority and CV version alongside the status", async () => {
    const t = await load();
    t.setStatus(9, "applied");
    t.updateEntry(9, { notes: "referred by alum", priority: 1, cvVersion: "Systems-SWE" });
    const e = (await load()).getEntry(9);
    expect(e).toMatchObject({
      status: "applied",
      notes: "referred by alum",
      priority: 1,
      cvVersion: "Systems-SWE",
    });
  });

  it("treats numeric and string job ids as the same job", async () => {
    const t = await load();
    t.setStatus(5, "oa");
    expect(t.getEntry("5")?.status).toBe("oa");
  });
});

describe("export / import round-trip", () => {
  it("restores exported entries", async () => {
    const t = await load();
    t.setStatus(1, "offer");
    t.updateEntry(1, { notes: "final round" });
    const exported = JSON.stringify({ version: 1, entries: JSON.parse(localStorage.getItem("trackerEntries")!) });

    const fresh = await load();
    localStorage.clear();
    fresh.replaceAll(fresh.parseImport(exported));
    expect(fresh.getEntry(1)).toMatchObject({ status: "offer", notes: "final round" });
  });

  it("accepts a bare entries object as well as the wrapped export", async () => {
    const t = await load();
    const parsed = t.parseImport(JSON.stringify({ "3": { status: "saved", updatedAt: "x" } }));
    expect(parsed["3"].status).toBe("saved");
  });

  it("drops malformed entries instead of failing the whole import", async () => {
    const t = await load();
    const parsed = t.parseImport(
      JSON.stringify({
        "1": { status: "applied", updatedAt: "x" },
        "2": { status: "not-a-status" },
        "3": null,
      })
    );
    expect(Object.keys(parsed)).toEqual(["1"]);
  });

  it("throws on input that is not JSON so the UI can report it", async () => {
    const t = await load();
    expect(() => t.parseImport("<html>")).toThrow();
  });
});

describe("CSV export", () => {
  it("uses the spreadsheet's column order and escapes commas and quotes", async () => {
    const t = await load();
    const csv = t.toCsv([
      {
        company: "Acme, Inc",
        title: 'SWE "Intern"',
        location: "Bengaluru, India",
        stipend: "₹80k/mo",
        season: "Summer 2027",
        entry: { status: "applied", priority: 1, cvVersion: "Systems-SWE", notes: "n", updatedAt: "x" },
        applyUrl: "https://x/1",
      },
    ]);
    const [header, row] = csv.split("\n");
    expect(header).toBe(
      "Company,Role,Location,Stipend,Season,Status,Priority,CV Version,Notes,Apply Link"
    );
    expect(row).toContain('"Acme, Inc"');
    expect(row).toContain('"SWE ""Intern"""');
    expect(row).toContain("Applied");
  });
});
