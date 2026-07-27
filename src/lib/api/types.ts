/** Types mirroring the portal auth API contract. */

export interface AppConfig {
  auth_mode: string;
  deep_link_email_login: boolean;
  require_login_otp: boolean;
  require_email_verification: boolean;
  captcha: { register: boolean; login: boolean };
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

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  email_verified: boolean;
  two_factor_enabled: boolean;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface TokenResponse extends TokenPair {
  user: AuthUser;
}

/**
 * The portal's JSON error envelope: `message` always, `errors` on 422
 * validation failures, and a `status` discriminator on some 403 responses
 * (e.g. `two_factor_required`, `login_otp_required`, `email_unverified`).
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
  /** reCAPTCHA v3 only: the action to execute (the portal verifies it matches). */
  action?: string;
}
