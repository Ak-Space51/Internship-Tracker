/** Streamed immediately on navigation so filter clicks give instant feedback
 * instead of leaving the previous results on screen while the server works. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 h-11 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
        <aside className="hidden space-y-6 md:block">
          {[6, 5, 4].map((rows, section) => (
            <div key={section}>
              <div className="mb-2 h-3 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="space-y-2">
                {Array.from({ length: rows }, (_, i) => (
                  <div key={i} className="h-5 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800/60" />
                ))}
              </div>
            </div>
          ))}
        </aside>

        <main>
          <div className="mb-3 h-5 w-56 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="space-y-4">
            {Array.from({ length: 6 }, (_, card) => (
              <div
                key={card}
                className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-800/40 px-4 py-2.5">
                  <div className="h-4 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-3 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                </div>
                {Array.from({ length: 3 }, (_, row) => (
                  <div key={row} className="border-b border-zinc-100 px-4 py-3 last:border-0 dark:border-zinc-800">
                    <div className="h-4 w-1/2 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800/60" />
                    <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800/60" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
