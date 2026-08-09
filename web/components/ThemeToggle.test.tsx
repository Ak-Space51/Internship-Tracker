import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Like the collapse store, the theme store is a module singleton, so each test
 * needs a fresh copy of it and of the toggle bound to it. */
async function load() {
  vi.resetModules();
  const [{ default: ThemeToggle }, theme] = await Promise.all([
    import("@/components/ThemeToggle"),
    import("@/lib/theme"),
  ]);
  return { ThemeToggle, ...theme };
}

const isDark = () => document.documentElement.classList.contains("dark");
const toggle = () => screen.getByRole("button");

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  globalThis.setPrefersDark(false);
});
afterEach(cleanup);

describe("theme toggle", () => {
  it("flips away from the OS theme on the first click", async () => {
    const user = userEvent.setup();
    const { ThemeToggle } = await load();
    render(<ThemeToggle />);
    expect(isDark()).toBe(false); // following a light OS

    await user.click(toggle());

    expect(localStorage.getItem("theme")).toBe("dark");
    expect(isDark()).toBe(true);
  });

  it("cycles back round to following the OS", async () => {
    const user = userEvent.setup();
    const { ThemeToggle } = await load();
    render(<ThemeToggle />);

    await user.click(toggle());
    expect(localStorage.getItem("theme")).toBe("dark");

    await user.click(toggle());
    expect(localStorage.getItem("theme")).toBe("light");
    expect(isDark()).toBe(false);

    await user.click(toggle());
    expect(localStorage.getItem("theme")).toBe("system");
    expect(isDark()).toBe(false);
  });

  it("restores a stored preference instead of the system one", async () => {
    localStorage.setItem("theme", "dark");
    const { ThemeToggle } = await load();

    render(<ThemeToggle />);

    expect(isDark()).toBe(true);
  });

  it("follows the OS when no preference is stored", async () => {
    globalThis.setPrefersDark(true);
    const { ThemeToggle } = await load();

    render(<ThemeToggle />);

    expect(isDark()).toBe(true);
    expect(localStorage.getItem("theme")).toBeNull();
  });

  it("reacts to the OS flipping while following the system", async () => {
    const { ThemeToggle } = await load();
    render(<ThemeToggle />);
    expect(isDark()).toBe(false);

    act(() => globalThis.setPrefersDark(true));

    expect(isDark()).toBe(true);
  });

  it("ignores the OS once a theme is chosen explicitly", async () => {
    const user = userEvent.setup();
    const { ThemeToggle } = await load();
    render(<ThemeToggle />);

    await user.click(toggle()); // -> dark
    await user.click(toggle()); // -> light, explicitly
    expect(localStorage.getItem("theme")).toBe("light");

    act(() => globalThis.setPrefersDark(true));

    expect(isDark()).toBe(false);
  });
});
