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

export interface PasswordRequirement {
  rule: PasswordRule;
  met: boolean;
}

/**
 * The policy's active rules paired with whether the given password meets each,
 * for a live checklist as the user types. Only the rules the policy enables are
 * returned (plus length whenever a minimum is set). Same predicates as
 * {@link checkPassword}, so the checklist and the submit-time gate never drift.
 */
export function passwordRequirements(
  password: string,
  policy: AppConfig["password"],
): PasswordRequirement[] {
  const requirements: PasswordRequirement[] = [];

  if (policy.min > 0) {
    requirements.push({ rule: "min", met: password.length >= policy.min });
  }
  if (policy.mixed_case) {
    requirements.push({
      rule: "mixed_case",
      met: /[a-z]/.test(password) && /[A-Z]/.test(password),
    });
  }
  if (policy.numbers) {
    requirements.push({ rule: "numbers", met: /\d/.test(password) });
  }
  if (policy.symbols) {
    requirements.push({ rule: "symbols", met: /[^A-Za-z0-9]/.test(password) });
  }

  return requirements;
}
