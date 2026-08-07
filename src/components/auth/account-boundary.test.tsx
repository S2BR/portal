import { render } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, expect, it, vi } from "vitest";

let currentUser: { id: number } | null = { id: 1 };
vi.mock("@/components/auth/current-user", () => ({
  useCurrentUser: () => ({
    user: currentUser,
    loading: false,
    refresh: vi.fn(),
  }),
}));

import { AccountBoundary } from "./account-boundary";

let mounts = 0;
/** Stands in for an account-scoped component whose mount effect fetches its data. */
function TrackMount() {
  useEffect(() => {
    mounts += 1;
  }, []);
  return null;
}

afterEach(() => {
  mounts = 0;
  currentUser = { id: 1 };
});

it("re-mounts its subtree when the active account changes, so account-scoped data re-queries", () => {
  const { rerender } = render(
    <AccountBoundary>
      <TrackMount />
    </AccountBoundary>,
  );
  expect(mounts).toBe(1);

  // An ordinary re-render with the same account must NOT re-mount (no wasted re-fetch).
  rerender(
    <AccountBoundary>
      <TrackMount />
    </AccountBoundary>,
  );
  expect(mounts).toBe(1);

  // Switch account → the subtree re-mounts → the child's mount effect (its fetch) runs again.
  currentUser = { id: 2 };
  rerender(
    <AccountBoundary>
      <TrackMount />
    </AccountBoundary>,
  );
  expect(mounts).toBe(2);
});
