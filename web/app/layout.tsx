import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { getLastIngestAt, getTargetSeason } from "@/lib/db";
import { prettySeason, timeAgo } from "@/lib/filters";
import "./globals.css";

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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-50 font-sans text-zinc-900">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight">
              Track<span className="text-indigo-600">Internships</span>
            </Link>
            <div className="flex items-center gap-5">
              <p className="hidden text-sm text-zinc-500 sm:block">
                Tracking{" "}
                <span className="font-semibold text-indigo-600">
                  {prettySeason(targetSeason)}
                </span>{" "}
                internships · India · Singapore · UK · Hong Kong
              </p>
              <nav className="flex items-center gap-4 text-sm font-medium text-zinc-600">
                <Link href="/saved" className="hover:text-indigo-600">
                  ★ Saved
                </Link>
                <Link href="/alerts" className="hover:text-indigo-600">
                  🔔 Alerts
                </Link>
              </nav>
            </div>
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="border-t border-zinc-200 bg-white py-4 text-center text-xs text-zinc-400">
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
