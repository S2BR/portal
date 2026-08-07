/**
 * Enter the app after establishing a session, with a FULL page load (not a client-side push).
 *
 * The current-user provider is mounted once in the root layout and preserved across client
 * navigations — great for zero API calls while moving around, but it means a client-side login
 * would leave the header showing the PREVIOUS account (or none), since the provider never
 * re-mounts. A full navigation re-mounts it against the new session. Uses `replace` so Back
 * doesn't return to the auth page.
 */
export function enterApp(path: string): void {
  window.location.replace(path);
}
