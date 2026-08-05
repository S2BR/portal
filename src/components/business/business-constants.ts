import type {
  BusinessContactType,
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

export const CONTACT_TYPES: BusinessContactType[] = [
  "website",
  "phone",
  "email",
];

export const DAYS: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
