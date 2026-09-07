"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { ProductSection } from "@/app/api/businesses/[slug]/product-sections/route";

/**
 * Optimistic, debounced persistence for a section's product membership — the model behind both the
 * picker and the Kanban, so assigning products feels instant and never triggers a page reload.
 *
 * `setProducts(sectionId, ids)` applies the new membership to local state immediately, then (after a
 * short debounce that collapses a burst of edits into one request) PUTs the full ordered id list. On
 * success it reconciles with the server's authoritative section; on failure it rolls back to the state
 * from before the burst and reports the error. Debouncing per section also sidesteps the last-write
 * race of firing a PUT per toggle.
 */
export function useSectionPersist(
  slug: string,
  setSections: Dispatch<SetStateAction<ProductSection[]>>,
  onError: () => void,
) {
  const base = `/api/businesses/${encodeURIComponent(slug)}/product-sections`;
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Pre-burst membership per section, kept until its flush settles, for rollback.
  const snapshots = useRef<Record<string, string[] | undefined>>({});

  // Latest error handler without making the persisters depend on its (inline) identity.
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const flush = useCallback(
    async (sectionId: string, ids: string[]) => {
      delete timers.current[sectionId];
      const snapshot = snapshots.current[sectionId];
      try {
        const response = await fetch(
          `${base}/${encodeURIComponent(sectionId)}/products`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids }),
          },
        );
        if (!response.ok) {
          throw new Error("persist failed");
        }
        const data = (await response.json()) as { section?: ProductSection };
        const authoritative = data.section?.product_ids ?? ids;
        setSections((current) =>
          current.map((section) =>
            section.id === sectionId
              ? { ...section, product_ids: authoritative }
              : section,
          ),
        );
      } catch {
        if (snapshot) {
          setSections((current) =>
            current.map((section) =>
              section.id === sectionId
                ? { ...section, product_ids: snapshot }
                : section,
            ),
          );
        }
        onErrorRef.current();
      } finally {
        snapshots.current[sectionId] = undefined;
      }
    },
    [base, setSections],
  );

  const setProducts = useCallback(
    (sectionId: string, nextIds: string[]) => {
      setSections((current) =>
        current.map((section) => {
          if (section.id !== sectionId) {
            return section;
          }
          if (snapshots.current[sectionId] === undefined) {
            snapshots.current[sectionId] = section.product_ids ?? [];
          }
          return { ...section, product_ids: nextIds };
        }),
      );
      if (timers.current[sectionId]) {
        clearTimeout(timers.current[sectionId]);
      }
      timers.current[sectionId] = setTimeout(() => {
        void flush(sectionId, nextIds);
      }, 350);
    },
    [flush, setSections],
  );

  // Flush any pending writes on unmount so a quick tab-away doesn't drop the last edit.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const id of Object.keys(pending)) {
        clearTimeout(pending[id]);
      }
    };
  }, []);

  return { setProducts };
}
