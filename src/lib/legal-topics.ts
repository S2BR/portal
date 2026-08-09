import GithubSlugger from "github-slugger";

export type LegalTopic = { id: string; label: string };

/**
 * Extracts the top-level (`##`/h2) topics from a markdown string, giving each the same id slug that
 * rehype-slug renders (a single GithubSlugger over the headings, in document order). That lets the
 * preview rail anchor to and scroll-spy the rendered headings without reading the DOM.
 */
export function topicsFromMarkdown(markdown: string): LegalTopic[] {
  const slugger = new GithubSlugger();
  const topics: LegalTopic[] = [];
  let inFence = false;

  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      continue;
    }
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) {
      continue;
    }
    const [, hashes, text] = match;
    if (!hashes || !text) {
      continue;
    }
    // Slug every heading (so duplicate counters match rehype-slug), but keep only the h2 topics.
    const id = slugger.slug(text);
    if (hashes.length === 2) {
      topics.push({ id, label: text });
    }
  }

  return topics;
}
