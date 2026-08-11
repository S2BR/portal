import type {
  BusinessSocialNetwork,
  DayOfWeek,
} from "@/app/api/businesses/route";

/** Social platforms with display names — proper nouns, so the same across every locale. */
export const SOCIAL_NETWORKS: {
  value: BusinessSocialNetwork;
  label: string;
}[] = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "x", label: "X" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "pinterest", label: "Pinterest" },
  { value: "snapchat", label: "Snapchat" },
  { value: "reddit", label: "Reddit" },
  { value: "tumblr", label: "Tumblr" },
  { value: "vimeo", label: "Vimeo" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telegram", label: "Telegram" },
  { value: "discord", label: "Discord" },
  { value: "github", label: "GitHub" },
  { value: "stackoverflow", label: "Stack Overflow" },
  { value: "medium", label: "Medium" },
  { value: "slack", label: "Slack" },
  { value: "wechat", label: "WeChat" },
];

const SOCIAL_LABELS: Record<BusinessSocialNetwork, string> = Object.fromEntries(
  SOCIAL_NETWORKS.map((network) => [network.value, network.label]),
) as Record<BusinessSocialNetwork, string>;

export function socialLabel(platform: BusinessSocialNetwork): string {
  return SOCIAL_LABELS[platform];
}

/**
 * The public base of each platform's profile URL — everything before the handle. Used both as the
 * fixed prefix shown in the edit field (the user types only their handle) and to build the full link
 * in read mode. Values are the bare host + path so they read cleanly as a prefix (e.g. `instagram.com/`).
 */
export const SOCIAL_BASE_URL: Record<BusinessSocialNetwork, string> = {
  instagram: "instagram.com/",
  facebook: "facebook.com/",
  x: "x.com/",
  linkedin: "linkedin.com/",
  youtube: "youtube.com/",
  tiktok: "tiktok.com/",
  pinterest: "pinterest.com/",
  snapchat: "snapchat.com/add/",
  reddit: "reddit.com/",
  tumblr: "tumblr.com/",
  vimeo: "vimeo.com/",
  whatsapp: "wa.me/",
  telegram: "t.me/",
  discord: "discord.gg/",
  github: "github.com/",
  stackoverflow: "stackoverflow.com/users/",
  medium: "medium.com/",
  slack: "slack.com/",
  wechat: "weixin.qq.com/",
};

/** The handle with its leading `@`/slashes trimmed, so it can be appended cleanly to the base URL. */
function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^\/+/, "");
}

/** The full `https://` link for a social profile. Passes an already-absolute handle through unchanged. */
export function socialUrl(
  platform: BusinessSocialNetwork,
  handle: string,
): string {
  const value = handle.trim();
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return `https://${SOCIAL_BASE_URL[platform]}${normalizeHandle(value)}`;
}

/** The read-mode label for a social profile — the full URL including `https://` (e.g.
 *  `https://instagram.com/acme`), matching the website contact link. */
export function socialDisplay(
  platform: BusinessSocialNetwork,
  handle: string,
): string {
  return socialUrl(platform, handle);
}

export const DAYS: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
