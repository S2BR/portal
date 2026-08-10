/** Types mirroring the api contract: plain JSON resources plus the auth envelopes. */

export interface AppConfig {
  auth_mode: string;
  deep_link_email_login: boolean;
  require_login_otp: boolean;
  require_email_verification: boolean;
  captcha: { register: boolean; login: boolean };
  passkeys: { enabled: boolean };
  password: {
    min: number;
    mixed_case: boolean;
    numbers: boolean;
    symbols: boolean;
  };
  otp: { length: number; ttl: number; resend_cooldown: number };
  hosted_auth: {
    register_url: string;
    login_url: string;
    forgot_url: string;
  };
  config_url: string | null;
}

/** The authenticated user returned by the api (`{ user: … }`). */
/** The account's self-selected gender (matches the api's Gender enum), or null if unset. */
export type Gender = "male" | "female" | "non_binary" | "prefer_not_to_say";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  timezone: string | null;
  // A short-lived presigned URL for the avatar image, or null.
  avatar: string | null;
  two_factor_enabled: boolean;
  // The account's date of birth as `YYYY-MM-DD`, or null if unset.
  date_of_birth: string | null;
  // The account's self-selected gender, or null if unset.
  gender: Gender | null;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

/** A sign-in success: the token pair at the top level, with the user nested. */
export interface SignInResponse extends TokenPair {
  user: AuthUser;
}

/**
 * The api's error envelope: `message` always, `errors` on 422 validation
 * failures, and a `status` discriminator on some 403 responses (e.g.
 * `two_factor_required`, `account_suspended`, `email_unverified`).
 */
export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  status?: string;
}

/**
 * A captcha challenge for a web client. `required: false` means the flow needs
 * no captcha. Otherwise the descriptor is provider-agnostic — `site_key` for
 * token widgets (Turnstile/hCaptcha/reCAPTCHA), `question` for the math driver —
 * bound to a single-use `challenge_id`. The client submits `"<challenge_id>~<answer>"`.
 */
export interface CaptchaChallenge {
  required: boolean;
  challenge_id?: string;
  driver?: string;
  site_key?: string;
  question?: string;
  /** reCAPTCHA v3 only: the action to execute (the api verifies it matches). */
  action?: string;
}
