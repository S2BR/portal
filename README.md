# S2BR Portal (web)

The authenticated web application for **business owners and community operators**.
A Next.js front-end that consumes the S2BR portal API.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 ·
shadcn/ui · next-intl · zod · Vitest · Playwright · pnpm. Hosted on Vercel.

## Getting started

```bash
pnpm install
cp .env.example .env.local   # then fill in the values
pnpm dev                     # http://localhost:3000
```

## Scripts

| Script                              | Purpose                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| `pnpm dev`                          | Dev server (Turbopack)                                                         |
| `pnpm build` / `pnpm start`         | Production build / serve                                                       |
| `pnpm typecheck`                    | `tsc --noEmit`                                                                 |
| `pnpm lint`                         | ESLint                                                                         |
| `pnpm format` / `pnpm format:check` | Prettier                                                                       |
| `pnpm test` / `pnpm test:watch`     | Vitest (unit/component)                                                        |
| `pnpm test:e2e`                     | Playwright (browser)                                                           |
| `pnpm verify`                       | typecheck + lint + format:check + test — **must be green before every commit** |

## Principles

- **Auth-gated by default** — only the `(auth)` route group is public; everything
  else requires a valid session (enforced in middleware).
- **Secure by design (BFF)** — JWTs live in `httpOnly` cookies set by our own route
  handlers; tokens never reach browser JS.
- **Everything translatable** — all copy flows through next-intl (`en`, `es`,
  `fr_CA`, `pt_BR`; default `en`).
- **Everything configurable via `.env`** — validated in `src/env.ts`.

The full engineering guide (charter, architecture, roadmap) is maintained
separately, outside this repo.
