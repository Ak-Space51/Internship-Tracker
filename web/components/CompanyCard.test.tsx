import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** The collapse store is a module singleton, so every test needs a fresh copy
 * of it (and of the components bound to it) to stay independent. */
async function load() {
  vi.resetModules();
  const [{ default: CompanyCard }, { default: CollapseControls }] = await Promise.all([
    import("@/components/CompanyCard"),
    import("@/components/CollapseControls"),
  ]);

  function Card({ slug = "acme", name = "Acme" }: { slug?: string; name?: string }) {
    return (
      <CompanyCard
        slug={slug}
        name={name}
        roleCount={2}
        seasonCount={1}
        seasonLabel="Summer 2027"
      >
        <ul>
          <li>{name} Backend Intern</li>
          <li>{name} Frontend Intern</li>
        </ul>
      </CompanyCard>
    );
  }

  return { Card, CollapseControls };
}

const postings = (name: string) => screen.queryByText(`${name} Backend Intern`);
const header = (name: string) => screen.getByRole("button", { name: new RegExp(name) });

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("per-company collapse", () => {
  it("hides every posting when the header is clicked", async () => {
    const user = userEvent.setup();
    const { Card } = await load();
    render(<Card />);
    expect(postings("Acme")).not.toBeNull();

    await user.click(header("Acme"));

    expect(postings("Acme")).toBeNull();
    expect(screen.queryByText("Acme Frontend Intern")).toBeNull();
  });

  it("expands again on a second click", async () => {
    const user = userEvent.setup();
    const { Card } = await load();
    render(<Card />);

    await user.click(header("Acme"));
    await user.click(header("Acme"));

    expect(postings("Acme")).not.toBeNull();
  });

  it("collapses only the company that was clicked", async () => {
    const user = userEvent.setup();
    const { Card } = await load();
    render(
      <>
        <Card slug="acme" name="Acme" />
        <Card slug="globex" name="Globex" />
      </>
    );

    await user.click(header("Acme"));

    expect(postings("Acme")).toBeNull();
    expect(postings("Globex")).not.toBeNull();
  });

  it("keeps the collapse-all control in sync with individual cards", async () => {
    const user = userEvent.setup();
    const { Card, CollapseControls } = await load();
    render(
      <>
        <CollapseControls slugs={["acme"]} />
        <Card slug="acme" name="Acme" />
      </>
    );

    await user.click(screen.getByRole("button", { name: /Collapse all/ }));
    expect(postings("Acme")).toBeNull();

    await user.click(screen.getByRole("button", { name: /Expand all/ }));
    expect(postings("Acme")).not.toBeNull();
  });

  it("restores collapsed companies from localStorage on load", async () => {
    localStorage.setItem("collapsedCompanies", JSON.stringify(["acme"]));
    const { Card } = await load();

    render(<Card />);

    expect(postings("Acme")).toBeNull();
  });
});