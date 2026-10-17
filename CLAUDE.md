# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Senior frontend test task: admin app for Smart Sender webhooks (sign in, list with search/pagination, edit form). The backend is fully mocked with MSW. Task brief: `docs/smart-sender-senior-frontend-test.md`.

Development is spec-driven with Spec Kit. **`.specify/memory/constitution.md` overrides specs, plans and tasks** — read it before non-trivial changes. Current feature artifacts: `specs/001-webhooks-admin-app/` (`spec.md`, `plan.md`, `tasks.md` is the source of truth for work items, `contracts/` documents non-obvious guarantees).

## Commands

pnpm, Node >= 22.12 (`.nvmrc`).

```bash
pnpm dev                 # Vite dev server; MSW worker serves the API in the browser
pnpm build               # tsc -b && vite build
pnpm typecheck           # app + node tsconfigs, --noEmit
pnpm lint                # eslint, --max-warnings 0
pnpm exec prettier --check .
pnpm test                # vitest run (node env, src/**/*.test.ts only)
pnpm exec vitest run src/api/http-client.test.ts -t "single rotate"   # single file / test
```

Mock login: `admin@smartsender.test` / `password123` (`src/mocks/db.ts`).

Pre-commit (husky) runs lint-staged, then full `typecheck` and `test`. `--no-verify` is forbidden. CI jobs `typecheck`, `lint` (incl. prettier check), `test` are required checks on `main` — do not rename them.

## Architecture

```
src/
  app/       router (TanStack Router, code-based), providers, guards, http client instance
  api/       framework-agnostic transport: http-client, ApiError, zod schemas, endpoints — no React
  mocks/     MSW handlers + in-memory db, shared by browser and tests
  features/  auth/, webhooks/ — features never import each other
  shared/    shadcn ui primitives, form-field, theme.css, cn
```

Dependency direction `app → features → api | shared`, enforced by ESLint `no-restricted-imports` in `eslint.config.js`. UI code never imports `mocks`; `api` tests may import only `mocks/server` and `mocks/db`.

**Transport (`src/api/http-client.ts`)** owns all session logic: `X-Requested-With` header, lazy single-flight CSRF fetch sent on POST/PUT, `419` → re-fetch CSRF + one retry, `401` → await one shared rotate promise + one retry, never rotate from rotate, rotate failure / repeated 401 → `onSessionExpired`. Components and hooks never call `fetch` or handle 401/419; TanStack Query `retry` is off for them. All responses validated with zod; types come from `z.infer`; errors normalized into `ApiError` discriminated union.

**Wiring**: `src/app/http.ts` exports `API_BASE_URL = window.location.origin`; `src/app/router.tsx` creates the client with `onSessionExpired` passed at creation, `api = createEndpoints(client)`, and the single-flight `endSession('expired' | 'signed-out')` teardown (abort queries → remove `me` → navigate `/login` with `replace` → `clear()` in `finally`). GET endpoints take the `queryFn` `signal`. `main.tsx` starts the MSW worker before rendering. Logout is `signOut()` (abort queries → revoke, errors ignored → `endSession('signed-out')`; `onSessionExpired` ignored while it runs). Router context carries `{ queryClient, api, signOut }`; routes prefetch their queries in `loader` (`defaultPreload: 'intent'`); the `_protected` route guards on cached `me` query data and redirects to `/login?redirect=...`.

**State ownership**: server state → TanStack Query; list `page`/`search` → URL only (zod `validateSearch`, search debounced with `replace`, pagination `push`); forms → react-hook-form + zod. No global store. `device_session_token` lives only as a local variable in the login flow; `localStorage` holds only `fingerprint`. Logout/expiry clears the whole query cache.

**Error ownership** (constitution VIII): 401/419 → transport; 422 → form `setError` per field (unknown → `root`); 404 → "not found" screen; other → error state with Retry. No global error toasts; toast only on successful save.

**Tests**: transport only (Vitest + MSW node server, no React, no fake timers — use `expireSession()` / `failNextUpdate()` helpers from `mocks/db`). UI is verified manually.

## Code rules (from constitution)

- No comments in code (incl. JSDoc); only tool directives with reason.
- Forbidden in prod and tests: `any`, `@ts-ignore`, non-null `!`, `as` assertions (only `as const`). Narrow with zod / type guards.
- `undefined`, never `null`; API `null` converted at the zod boundary.
- Exhaustive union handling (`assertNever` / `satisfies never`).
- No abstraction before the third repetition (obviously duplicated logic may be extracted at the second); no `utils/`/`helpers/` folders; kebab-case files, max 3 nesting levels in `src/`, ~200 lines per file.
- UI strings in English, no i18n library. Brand colors only via tokens in `src/shared/theme.css`, no hex in components.

## Workflow

One GitHub issue per user story; branch `feat/<n>-<slug>`; Conventional Commits; PR with `Closes #n`. The repo owner merges PRs manually.
