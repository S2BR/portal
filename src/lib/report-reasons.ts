/** The trust-and-safety report reason categories — mirror of the API's ReportReason enum. Shared by
 *  the report dialog (client) and the /api/reports BFF (server), so it lives outside either. */
export const REPORT_REASONS = [
  "spam",
  "harassment",
  "hate_speech",
  "violence",
  "sexual_content",
  "child_sexual_abuse",
  "illegal",
  "misinformation",
  "impersonation",
  "privacy",
  "other",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];
