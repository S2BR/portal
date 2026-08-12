"use client";

import { ServiceUnavailable } from "@/components/ui/service-unavailable";

/**
 * The authenticated segment's error boundary — the safety net for any UNHANDLED render throw (the
 * data surfaces catch their own fetch failures). Instead of Next's raw error screen it shows the
 * friendly service-unavailable state, which auto-retries via the boundary's `reset()` on the same
 * decaying backoff. Centered below the header like the not-found / loading states.
 */
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="-my-10 flex min-h-[calc(100svh-4rem)] items-center justify-center px-6">
      <ServiceUnavailable onRetry={reset} />
    </div>
  );
}
