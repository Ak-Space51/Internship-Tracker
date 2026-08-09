"use client";

import { cycleTheme, useTheme } from "@/lib/theme";

const LABELS = {
  light: { icon: "☀", title: "Light theme — click for dark" },
  dark: { icon: "☾", title: "Dark theme — click to follow your system" },
  system: { icon: "◐", title: "Following your system theme — click for light" },
} as const;

export default function ThemeToggle() {
  const { theme } = useTheme();
  const { icon, title } = LABELS[theme];

  return (
    <button
      type="button"
      onClick={cycleTheme}
      title={title}
      aria-label={title}
      className="rounded-md border border-zinc-300 px-2 py-1 text-sm leading-none text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
    >
      {icon}
    </button>
  );
}
