// Vitest alias for `next/headers`, which isn't available outside a Next request.
// Cookies resolve to empty so server-only code that reads them stays testable.
export function cookies() {
  return Promise.resolve({ get: () => undefined });
}
