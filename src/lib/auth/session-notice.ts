/**
 * A one-shot, non-httpOnly cookie carrying a UI notice to show the user AFTER a server-side session
 * change they didn't explicitly trigger — chiefly the switcher falling back to another signed-in
 * account when the active session unexpectedly ended. A client component reads it once, toasts, and
 * clears it. It holds no credentials — just what to say.
 */
export const NOTICE_COOKIE = "s2br_notice";

export interface SessionNotice {
  /** The switcher activated another signed-in account because the active session ended. */
  kind: "account_fallback";
  /** The now-active account's display name. */
  account: string;
}

export function encodeNotice(notice: SessionNotice): string {
  return encodeURIComponent(JSON.stringify(notice));
}

export function decodeNotice(raw: string | undefined): SessionNotice | null {
  if (!raw) {
    return null;
  }
  try {
    const notice = JSON.parse(decodeURIComponent(raw)) as SessionNotice;
    return notice?.kind === "account_fallback" &&
      typeof notice.account === "string"
      ? notice
      : null;
  } catch {
    return null;
  }
}
