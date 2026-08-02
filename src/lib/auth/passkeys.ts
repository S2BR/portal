"use client";

import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/browser";

export { browserSupportsWebAuthn };

/** A stored passkey, as returned by the BFF (mirrors the portal's PasskeyResource). */
export interface PasskeySummary {
  id: number;
  name: string;
  last_used_at: string | null;
  created_at: string | null;
}

/**
 * Run the browser's registration ceremony against portal-issued creation
 * options. The credential never contains private key material — the returned
 * attestation is safe to send to the BFF for verification and storage.
 */
export function createPasskeyCredential(
  options: PublicKeyCredentialCreationOptionsJSON,
): Promise<RegistrationResponseJSON> {
  return startRegistration({ optionsJSON: options });
}

/** Run the browser's authentication ceremony against portal-issued request options. */
export function getPasskeyAssertion(
  options: PublicKeyCredentialRequestOptionsJSON,
): Promise<AuthenticationResponseJSON> {
  return startAuthentication({ optionsJSON: options });
}

/**
 * Whether a thrown ceremony error is just the user dismissing or timing out of
 * the native prompt, rather than a real failure. Those are silent — showing an
 * error for a deliberate cancellation would be noise.
 */
export function isPasskeyCancellation(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  if (error.name === "NotAllowedError" || error.name === "AbortError") {
    return true;
  }
  // @simplewebauthn wraps some cancellations in a WebAuthnError with a code.
  const code = (error as { code?: string }).code;
  return code === "ERROR_CEREMONY_ABORTED";
}
