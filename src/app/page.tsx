import Image from "next/image";

/**
 * Temporary boot page — confirms the app is running and shows the brand.
 * It gets replaced once the authenticated app shell and auth route groups land.
 */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <Image
        src="/s2br.svg"
        alt="S2BR"
        width={88}
        height={88}
        priority
        unoptimized
        className="rounded-2xl shadow-sm"
      />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">S2BR Portal</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Foundation in progress — authentication is next.
        </p>
      </div>
      <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        dev server running
      </span>
    </main>
  );
}
