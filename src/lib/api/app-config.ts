import "server-only";

import { portalFetch } from "./client";
import type { AppConfig } from "./types";

/**
 * Safe defaults used when the portal is briefly unreachable. Captcha and email
 * verification default to ON — we'd rather over-protect than skip a check.
 */
const FALLBACK_CONFIG: AppConfig = {
  auth_mode: "remote_first",
  deep_link_email_login: false,
  require_login_otp: false,
  require_email_verification: true,
  captcha: { register: true, login: true },
  password: { min: 10, mixed_case: true, numbers: true, symbols: true },
  otp: { length: 6, ttl: 900, resend_cooldown: 60 },
  hosted_auth: { register_url: "", login_url: "", forgot_url: "" },
  config_url: null,
};

/** Fetch the portal's client bootstrap config (captcha/password/OTP policy). */
export async function getAppConfig(): Promise<AppConfig> {
  try {
    const response = await portalFetch<AppConfig>({ path: "/app/config" });
    return response.ok ? response.data : FALLBACK_CONFIG;
  } catch {
    return FALLBACK_CONFIG;
  }
}
