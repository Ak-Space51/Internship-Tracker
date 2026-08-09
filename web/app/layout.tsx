import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import ThemeToggle from "@/components/ThemeToggle";
import { getLastIngestAt, getTargetSeason } from "@/lib/db";
import { prettySeason, timeAgo } from "@/lib/filters";
import "./globals.css";

/** Runs before first paint, so a dark-theme user never sees a white flash.
 * The server cannot know the preference, so the class has to be set here
 * rather than during render. Mirrors the logic in lib/theme.ts. */
const themeScript = `
(function(){try{
  var t = localStorage.getItem('theme');
  var dark = t === 'dark' || ((!t || t === 'system') &&
    window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}catch(e){}})();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrackInternships",
  description:
    "Every open internship in India, Singapore, UK and Hong Kong — aggregated from 50+ company career boards.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [targetSeason, lastIngestAt] = await Promise.all([
    getTargetSeason(),
    getLastIngestAt(),
  ]);
  return (
    <html
      lang="en"
      // themeScript sets class and colorScheme before React hydrates
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight">
              Track<span className="text-indigo-600">Internships</span>
            </Link>
            <div className="flex items-center gap-5">
              <p className="hidden text-sm text-zinc-500 sm:block dark:text-zinc-400">
                Tracking{" "}
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {prettySeason(targetSeason)}
                </span>{" "}
                internships · India · Singapore · UK · Hong Kong
              </p>
              <nav className="flex items-center gap-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                <Link href="/saved" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  ★ Saved
                </Link>
                <Link href="/alerts" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  🔔 Alerts
                </Link>
              </nav>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="border-t border-zinc-200 bg-white py-4 text-center text-xs text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          Aggregated from public company career boards. Apply directly on the
          company site.
          {lastIngestAt && (
            <>
              {" · "}
              Boards last checked{" "}
              <time dateTime={new Date(lastIngestAt).toISOString()}>
                {timeAgo(lastIngestAt)}
              </time>
            </>
          )}
        </footer>
      </body>
    </html>
  );
}
