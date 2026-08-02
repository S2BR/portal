/** Types mirroring the api contract: JSON:API resources plus the auth envelopes. */

/** A JSON:API resource object — identity (`type` + string `id`) plus typed attributes. */
export interface JsonApiResource<A> {
  type: string;
  id: string;
  attributes: A;
}

/** A single-resource JSON:API document. */
export interface JsonApiDocument<A> {
  data: JsonApiResource<A>;
}

/** A JSON:API resource-collection document. */
export interface JsonApiCollection<A> {
  data: JsonApiResource<A>[];
}

/** Flatten a resource object to `{ id, ...attributes }` for app use. */
export function flattenResource<A>(
  resource: JsonApiResource<A>,
): { id: string } & A {
  return { id: resource.id, ...resource.attributes };
}

/** Flatten every resource in a collection document. */
export function flattenCollection<A>(
  collection: JsonApiCollection<A>,
): ({ id: string } & A)[] {
  return collection.data.map(flattenResource);
}

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

/** The `users` resource attributes returned by the api. */
export interface UserAttributes {
  name: string;
  email: string;
  timezone: string | null;
  two_factor_enabled: boolean;
  created_at: string;
}

/** The authenticated user, flattened (`id` + attributes) for app use. */
export type AuthUser = { id: string } & UserAttributes;

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

/** A sign-in success: the user as JSON:API `data`, the token pair in `meta`. */
export interface SignInResponse {
  data: JsonApiResource<UserAttributes>;
  meta: TokenPair;
}

/**
 * The api's plain error envelope: `message` always, `errors` on 422 validation
 * failures, and a `status` discriminator on some 403 responses (e.g.
 * `two_factor_required`, `account_suspended`, `email_unverified`). Errors are
 * deliberately not JSON:API — only success bodies are.
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
