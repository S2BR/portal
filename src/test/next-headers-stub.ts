// Vitest alias for `next/headers`, which isn't available outside a Next request.
// Cookies and headers resolve to empty so server-only code that reads them stays testable.
export function cookies() {
  return Promise.resolve({ get: () => undefined });
}

export function headers() {
  return Promise.resolve({ get: () => null });
}
