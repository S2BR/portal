/**
 * A short, human-friendly device label from a browser User-Agent, e.g. "Chrome on macOS".
 * Used as the `X-Device-Name` the BFF forwards to the API so the sessions list shows a real
 * device instead of the server runtime's UA. Best-effort — falls back to "Web browser".
 */
export function deviceNameFromUserAgent(userAgent: string): string {
  const ua = userAgent.trim();
  if (ua === "") {
    return "Web browser";
  }

  // Order matters: Edge/Opera/Brave masquerade as Chrome; Chrome masquerades as Safari.
  const browser = /\bEdg(?:e|A|iOS)?\//.test(ua)
    ? "Edge"
    : /\bOPR\/|\bOpera\b/.test(ua)
      ? "Opera"
      : /\bBrave\//.test(ua)
        ? "Brave"
        : /\bFirefox\/|\bFxiOS\//.test(ua)
          ? "Firefox"
          : /\bChrome\/|\bCriOS\//.test(ua)
            ? "Chrome"
            : /\bSafari\//.test(ua)
              ? "Safari"
              : null;

  const os = /\bWindows\b/.test(ua)
    ? "Windows"
    : /\biPhone\b/.test(ua)
      ? "iPhone"
      : /\biPad\b/.test(ua)
        ? "iPad"
        : /\bMac OS X\b|\bMacintosh\b/.test(ua)
          ? "macOS"
          : /\bAndroid\b/.test(ua)
            ? "Android"
            : /\bLinux\b/.test(ua)
              ? "Linux"
              : null;

  if (browser && os) {
    return `${browser} on ${os}`;
  }
  return browser ?? os ?? "Web browser";
}
