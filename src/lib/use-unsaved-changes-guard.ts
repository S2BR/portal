"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/** The subset of the Navigation API's `navigate` event we rely on. */
type NavigateEvent = {
  canIntercept: boolean;
  hashChange: boolean;
  downloadRequest: string | null;
  destination: { url: string };
  preventDefault: () => void;
};

type NavigationApi = {
  addEventListener: (
    type: "navigate",
    listener: (event: NavigateEvent) => void,
  ) => void;
  removeEventListener: (
    type: "navigate",
    listener: (event: NavigateEvent) => void,
  ) => void;
};

export type LeaveGuard = {
  /** Whether the styled confirmation dialog should be shown. */
  open: boolean;
  /** Proceed with the blocked navigation (or in-place action) and close the dialog. */
  confirm: () => void;
  /** Dismiss the dialog and stay put. */
  cancel: () => void;
  /** Guard an in-place exit that isn't a navigation (e.g. a Cancel button leaving edit mode). */
  requestLeave: (action: () => void) => void;
};

/** True when leaving the current path for another page (not a hash/query change on this one). */
function leavesPage(url: string): boolean {
  return (
    new URL(url, window.location.href).pathname !== window.location.pathname
  );
}

/**
 * Warns before the user leaves a page that has unsaved work — however they try to leave — and drives
 * a styled confirmation dialog rather than the browser's `confirm()`.
 *
 * While `enabled`, the returned `open` flag is raised so the caller can render its own dialog;
 * `confirm()` then re-runs the blocked navigation, `cancel()` stays. Coverage:
 * - In-app links (menu items, `<Link>`) — a capture-phase click interceptor blocks them before the
 *   router runs. This is the reliable primitive: Next turns link clicks into `history.pushState`,
 *   which never emits a Navigation API `navigate` event, so links can't be caught that way.
 * - Browser back/forward — the Navigation API's `navigate` event (a real traversal does fire it);
 *   where that API is absent (Safari/Firefox) a `popstate` sentinel with a native confirm stands in.
 * - `requestLeave(action)` funnels an in-place exit (a Cancel/Escape leaving edit mode) through the
 *   same dialog.
 *
 * The hard-exit prompt (refresh, tab close, external URL) stays native `beforeunload` — browsers
 * always render that one themselves.
 */
export function useUnsavedChangesGuard(
  enabled: boolean,
  fallbackMessage: string,
): LeaveGuard {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const pendingRef = useRef<(() => void) | null>(null);
  const bypassRef = useRef(false);

  const confirm = useCallback(() => {
    setOpen(false);
    const action = pendingRef.current;
    pendingRef.current = null;
    action?.();
  }, []);

  const cancel = useCallback(() => {
    setOpen(false);
    pendingRef.current = null;
  }, []);

  const requestLeave = useCallback(
    (action: () => void) => {
      if (!enabled) {
        action();
        return;
      }
      pendingRef.current = action;
      setOpen(true);
    },
    [enabled],
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const cleanups: (() => void)[] = [];

    // Hard exits: refresh, tab/window close, typing a new URL, external links — always native.
    const warnOnUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = ""; // legacy assignment some browsers still require
    };
    window.addEventListener("beforeunload", warnOnUnload);
    cleanups.push(() =>
      window.removeEventListener("beforeunload", warnOnUnload),
    );

    // In-app links (menu items, <Link>). Capture phase runs before the router's own click handler,
    // so blocking here reliably stops the navigation; on confirm we re-run it.
    const onLinkClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      const href = anchor?.getAttribute("href");
      if (
        !anchor ||
        !href ||
        href.startsWith("#") ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        !leavesPage(anchor.href)
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const target = new URL(anchor.href);
      pendingRef.current = () => router.push(target.pathname + target.search);
      setOpen(true);
    };
    document.addEventListener("click", onLinkClick, true);
    cleanups.push(() =>
      document.removeEventListener("click", onLinkClick, true),
    );

    const navigation = (window as unknown as { navigation?: NavigationApi })
      .navigation;

    if (navigation) {
      // Browser back/forward (a real traversal fires this). Link clicks are already blocked above, so
      // they never reach here — no double prompt.
      const onNavigate = (event: NavigateEvent) => {
        if (bypassRef.current) {
          bypassRef.current = false; // our own confirmed re-navigation
          return;
        }
        if (
          !event.canIntercept ||
          event.hashChange ||
          event.downloadRequest !== null ||
          !leavesPage(event.destination.url)
        ) {
          return;
        }
        event.preventDefault();
        const target = new URL(event.destination.url);
        pendingRef.current = () => {
          bypassRef.current = true;
          router.push(target.pathname + target.search);
        };
        setOpen(true);
      };
      navigation.addEventListener("navigate", onNavigate);
      cleanups.push(() =>
        navigation.removeEventListener("navigate", onNavigate),
      );
    } else {
      // No Navigation API (Safari/Firefox): guard back/forward with a sentinel entry + native confirm
      // (a synchronous popstate can't wait on the styled dialog).
      window.history.pushState(null, "", window.location.href);
      const onPopState = () => {
        if (window.confirm(fallbackMessage)) {
          window.removeEventListener("popstate", onPopState);
          window.history.back();
        } else {
          window.history.pushState(null, "", window.location.href);
        }
      };
      window.addEventListener("popstate", onPopState);
      cleanups.push(() => window.removeEventListener("popstate", onPopState));
    }

    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  }, [enabled, fallbackMessage, router]);

  return { open, confirm, cancel, requestLeave };
}
