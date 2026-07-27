import type { AppConfig } from "@/lib/api/types";

export type PasswordRule = "min" | "mixed_case" | "numbers" | "symbols";

/**
 * Check a password against the portal's policy (from `/app/config`). Returns
 * the first failed rule, or `null` when it satisfies the policy. Client-side
 * pre-check only — the portal remains the source of truth (it also runs a
 * breach check we can't replicate here).
 */
export function checkPassword(
  password: string,
  policy: AppConfig["password"],
): PasswordRule | null {
  if (password.length < policy.min) {
    return "min";
  }
  if (
    policy.mixed_case &&
    !(/[a-z]/.test(password) && /[A-Z]/.test(password))
  ) {
    return "mixed_case";
  }
  if (policy.numbers && !/\d/.test(password)) {
    return "numbers";
  }
  if (policy.symbols && !/[^A-Za-z0-9]/.test(password)) {
    return "symbols";
  }
  return null;
}
