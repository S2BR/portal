/**
 * Turn a user-entered website into an absolute URL. Website values are often stored without a
 * scheme (`s2br.com`), and a bare `href="s2br.com"` resolves relative to the current page (e.g.
 * `/businesses/s2br.com`). Prepend `https://` when there's no scheme so the link points off-site;
 * values that already carry `http(s)://` pass through unchanged.
 */
export function externalHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}
