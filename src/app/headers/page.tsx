import type { Metadata } from "next";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Request headers",
  // A throwaway debug route — keep it out of search indexes.
  robots: { index: false, follow: false },
};

/**
 * TEMPORARY debug route: dumps every header the server receives for this request (including the
 * `x-vercel-*` / `x-forwarded-*` set added by Vercel's edge). Reading `headers()` forces per-request
 * dynamic rendering, so it always reflects the live request. Remove when done.
 */
export default async function HeadersDebugPage() {
  const headerList = await headers();
  const entries = [...headerList.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-lg font-semibold">Request headers</h1>
      <p className="text-muted-foreground mt-1 mb-6 text-sm">
        {entries.length} headers received by the server for this request —
        temporary debug route.
      </p>

      <dl className="divide-border overflow-hidden rounded-xl border font-mono text-sm">
        {entries.map(([name, value]) => (
          <div
            key={name}
            className="odd:bg-muted/40 grid grid-cols-1 gap-1 px-4 py-2.5 sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-4"
          >
            <dt className="text-primary font-medium break-all">{name}</dt>
            <dd className="text-foreground break-all whitespace-pre-wrap">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
