/**
 * Turn a portal error payload into display text, preferring the API's own
 * field-level messages (a 422 `errors` bag) over the generic top-level
 * `message`, so the real validation feedback reaches the user verbatim rather
 * than being masked by a vague "The given data was invalid." Returns `null`
 * when the payload carries nothing usable, letting the caller fall back to a
 * local generic string.
 */
export function apiErrorText(data: {
  message?: string;
  errors?: Record<string, string[]>;
}): string | null {
  const fieldErrors = data.errors
    ? Object.values(data.errors)
        .flat()
        .filter((message): message is string => Boolean(message))
    : [];

  if (fieldErrors.length > 0) {
    return fieldErrors.join(" ");
  }

  return data.message ?? null;
}
