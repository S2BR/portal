import type { Metadata } from "next";

/**
 * Master switch for whether the PUBLIC business surfaces (the directory + individual profile pages)
 * may be indexed by search engines. Temporarily `false` while running live tests with real data, so
 * Google doesn't index test pages by accident. Flip to `true` to re-open indexing — robots.txt, the
 * sitemap, and the page-level `robots` meta all read this single flag.
 */
export const PUBLIC_BUSINESS_PAGES_INDEXABLE = false;

/**
 * Page-level robots directive for the public business pages: `noindex, nofollow` while the surfaces
 * are closed to crawlers, otherwise the framework default (indexable).
 */
export const businessPagesRobots: Metadata["robots"] =
  PUBLIC_BUSINESS_PAGES_INDEXABLE ? undefined : { index: false, follow: false };
