# Implementation Plan: Webhooks Admin App (Smart Sender Senior Frontend Test)

**Branch**: `001-webhooks-admin-app` | **Date**: 2026-10-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-webhooks-admin-app/spec.md`

## Summary

This is a single-page React app with sign-in, a paginated and searchable webhook list, and webhook
editing. It runs against an MSW mock that implements the contract from
`docs/smart-sender-senior-frontend-test.md`. The core of the work is a framework-agnostic `fetch`
transport. It fetches the CSRF token once and shares it, shares one rotate across concurrent 401s,
retries each request at most once per error class, and normalises errors into a typed `ApiError`.
On top of it sit TanStack Query for server state, TanStack Router search params as the only owner
of list state, and react-hook-form + zod for forms with server errors mapped to fields. Design
decisions are recorded in [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript ~6.0.3 (strict, `noUncheckedIndexedAccess`). It is pinned below 7
because typescript-eslint 8 supports `<6.1`. Node 22.18 is used, and MSW 3 needs Node ≥ 22.12.

**Primary Dependencies**: React 19, Vite 8, TanStack Query 5, TanStack Router 1 (code-based),
react-hook-form 7 + @hookform/resolvers 5, zod 4, MSW 3, Tailwind CSS 4 + shadcn/ui, sonner,
@fontsource/montserrat + open-sans.

**Storage**: none on the client except `localStorage.fingerprint`. Mock state is held in memory.

**Testing**: Vitest 5 (node env) with MSW `setupServer`, and no React in tests. The UI is checked
by hand using the README checklist.

**Target Platform**: modern evergreen desktop browsers. Dev server: Vite.

**Project Type**: single frontend web application (no backend; the API is mocked by MSW).

**Performance Goals**: interactions feel instant. List page changes keep previous data visible
(`keepPreviousData`), and search is debounced at 300 ms.

**Constraints**: 4-hour budget (Principle II order). No tokens in state, URL or storage.
Zero type, lint and test errors or warnings. `src/` nesting is at most 3 levels, with files of
about 150 lines or less.

**Scale/Scope**: 1 user, 28 webhooks, 3 screens (login, list, edit), 1 required test plus up to 4
optional transport tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pre-research | Post-design |
| --- | --- | --- | --- |
| I. Simplicity First | No abstractions before 3rd repetition; no factories/DI "just in case"; descriptive file names; ≤ 3 levels | ✅ | ✅ `createHttpClient` has 2 real callers (app, test) because of the base URL (R4). Own `useDebouncedValue` instead of a dependency. |
| II. Core Correctness Over Scope | Session/rotate, CSRF, URL state, field errors, typing first; no growth infra | ✅ | ✅ Task order in `/speckit-tasks` follows transport → auth → list → edit → polish. |
| III. Isolated Transport Layer | `fetch` client in `src/api`, no React/Query; XHR header; lazy single-flight CSRF; 419 → 1 retry; 401 → shared rotate → 1 retry; no rotate from rotate; zod at boundary; typed `ApiError`; Query retry off for 401/419 | ✅ | ✅ Algorithm in R5, contract in [contracts/http-client.md](./contracts/http-client.md); Query `retry: false` (R11). |
| IV. Single Source of Truth | Server state → Query; list state → URL; forms → RHF; no global store; device token local var only; only `fingerprint` in storage; logout/expiry clears cache | ✅ | ✅ Auth signal = `me` in the cache (R6). The search `draft` is input text, not navigation state (R8). |
| V. Test What Is Risky | Required 2×401 → 1 rotate test; transport test-first; one shared mock; `expireSession()` instead of fake timers | ✅ | ✅ R12; `createHandlers(baseUrl)` is shared by browser and tests. |
| VI. Explicit Module Boundaries | `app → features → api \| shared`; api has no React; features don't import each other; mocks import only api schemas; enforced by ESLint | ✅ | ✅ The structure below matches; `no-restricted-imports` zones are defined in the Setup phase. |
| VII. Types as Contract | strict flags; no `any`/`!`/`as` (only `as const`)/`@ts-ignore`; `undefined` over `null`; exhaustive unions; `strictTypeChecked` | ✅ | ✅ `ApiError.info` is a discriminated union with `satisfies never` (data-model). |
| VIII. Every Error Has One Owner | the error ownership table | ✅ | ✅ Mapped in data-model ApiError table and ui-routes screen states. |
| Tech & UI constraints | Stack, URL write modes, semantic markup, Ukrainian UI, brand tokens in `theme.css`, no logo assets | ✅ | ✅ R8, R13, ui-routes. |
| Workflow | Setup PR first (ESLint, Prettier, husky + lint-staged, CI); issues per story; manual merge | ✅ | ✅ This is carried into `/speckit-tasks` as Phase 1 (Setup). |

**Result**: PASS, with no violations and nothing to record in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-webhooks-admin-app/
├── plan.md              # this file
├── research.md          # Phase 0 — decisions R1–R13
├── data-model.md        # Phase 1 — entities, ApiError, search params, mock state machine
├── quickstart.md        # Phase 1 — run + validation checklist
├── contracts/
│   ├── http-api.md      # mock/server HTTP contract
│   ├── http-client.md   # transport module surface + guarantees G1–G8
│   └── ui-routes.md     # routes, guards, search params, screen states
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
.nvmrc · package.json · pnpm-lock.yaml · vite.config.ts · vitest.config.ts
tsconfig.json · tsconfig.app.json · tsconfig.node.json · eslint.config.js · .prettierrc
components.json · .husky/pre-commit · .github/workflows/ci.yml · README.md
public/mockServiceWorker.js

src/
├── main.tsx                     # start MSW worker (dev), mount <App/>
├── app/
│   ├── app.tsx                  # providers: QueryClientProvider, RouterProvider, Toaster
│   ├── query-client.ts          # QueryClient defaults (retry: false)
│   ├── http.ts                  # the single createHttpClient instance + onSessionExpired wiring
│   ├── router.tsx               # route tree, protected layout beforeLoad guard
│   └── protected-layout.tsx     # header: wordmark, me.name, logout
├── api/
│   ├── http-client.ts           # fetch transport: CSRF, rotate single-flight, retries
│   ├── http-client.test.ts      # required 2×401 test (+ optional G5–G7)
│   ├── api-error.ts             # ApiError class + ApiErrorInfo union + toApiError
│   ├── schemas.ts               # zod: User, Webhook, WebhookList, error envelope, inputs
│   ├── endpoints.ts             # typed endpoint functions
│   └── fingerprint.ts           # get-or-create 32-hex device id in localStorage
├── mocks/
│   ├── db.ts                    # in-memory state, seed, resetDb, expireSession, endSession
│   ├── handlers.ts              # createHandlers(baseUrl) — contract implementation
│   ├── browser.ts               # setupWorker + dev `window.__mock`
│   └── server.ts                # setupServer for tests
├── features/
│   ├── auth/
│   │   ├── login-page.tsx       # form + "session expired" banner
│   │   ├── use-login.ts         # login → issue → me mutation (token stays local)
│   │   ├── use-logout.ts        # revoke → clear cache → /login
│   │   └── me-query.ts          # meQueryKey + meQueryOptions
│   └── webhooks/
│       ├── list-search.ts       # zod search schema shared by list + edit routes
│       ├── webhook-queries.ts   # list/detail query options, update mutation
│       ├── webhooks-page.tsx    # list screen: states + table + pagination
│       ├── webhook-search-input.tsx   # draft + debounce → URL (replace)
│       ├── webhook-edit-page.tsx      # loading / not-found / error / form
│       └── webhook-edit-form.tsx      # RHF + zod + server field errors
└── shared/
    ├── theme.css                # brand tokens → shadcn variables, fonts
    ├── use-debounced-value.ts
    ├── error-state.tsx          # message + "Повторити"
    └── ui/                      # shadcn primitives (button, input, label, table, …)
```

**Structure Decision**: this is a single Vite project using the module boundaries of Constitution
Principle VI. `api` is pure TypeScript, and the only test lives next to the transport.
`shared/ui` holds the generated shadcn components (third nesting level: `src/shared/ui/*`).

## Delivery order (input for `/speckit-tasks`)

1. **Setup** (first PR): Vite + TS strict, ESLint (`strictTypeChecked`, react-hooks, import
   boundaries), Prettier, husky + lint-staged, CI, Tailwind + shadcn + theme, `.nvmrc`.
2. **Foundation**: schemas, `ApiError`, mock db + handlers, transport written test-first, with the
   required test green. This blocks all stories.
3. **US1 + US2 (P1)**: router and guard, login flow, `me`, logout, session-expired handling.
4. **US3 (P2)**: list with URL state, search debounce, states.
5. **US4 (P3)**: edit route, form, server errors, not-found, toast.
6. **Polish**: optional transport tests G5–G7, README (run, credentials, decisions, trade-offs,
   scaling notes, time spent, Spec Kit note), final quality gate.

## Complexity Tracking

No constitution violations.
