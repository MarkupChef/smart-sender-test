---

description: "Task list for Webhooks Admin App (Smart Sender Senior Frontend Test)"
---

# Tasks: Webhooks Admin App (Smart Sender Senior Frontend Test)

**Input**: Design documents from `specs/001-webhooks-admin-app/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: The spec requires one automated test (FR-030), and the constitution (Principle V)
requires the transport to be written test-first. Transport tests live in Phase 2: the required
2×401 test (T020) plus the rotate-safety tests G5/G6 (T051), promoted from optional because "no
rotate recursion" is evaluated (Principle II.1). Optional extra transport tests (G2, concurrent
G6, G7) are in the Polish phase. There are no UI/e2e tests; this is a documented
trade-off.

**Organization**: tasks are grouped by user story. Per the constitution's Development Workflow, each
phase becomes **one GitHub issue**, except Phases 3 and 4 (US1 + US2, both P1), which share issue #3
(justified in plan.md Complexity Tracking). Each issue becomes one branch `feat/<n>-<slug>`, created from `main` after the previous PR is
merged, and one PR.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: US1–US4 from spec.md
- Task IDs are stable and not renumbered: T050 and T051 were added after generation and are placed
  where they run (T050 after T001, T051 after T022); T036 and T037 were removed and stay struck
  through. Existing references (issues, commits, other docs) therefore stay valid
- All paths are relative to the repository root (a single Vite project, `src/` per plan.md)
- Feature code (T026, T032, T038, T041, T042, T045) gets the `api` instance from the router
  context (`useRouteContext({ from: '__root__' })`, see T025), never from `@/app`

## Global rules for every task (from the constitution)

- No `any`, `!`, `@ts-ignore`, or `as` (only `as const`), in production code and tests. Use
  `undefined` and never `null`. Unions are handled exhaustively with `satisfies never`.
- TS types come from zod via `z.infer`. There are no hand-written duplicates.
- Files are `kebab-case`, about 150 lines or fewer, with at most 3 nesting levels in `src/`. No
  `utils/`/`helpers/`.
- Import direction is `app → features → api | shared`. `api` has no React. Features do not import
  each other. `mocks` imports only from `api/schemas.ts`.
- UI strings are in Ukrainian. There are no hard-coded hex colors in components.
- Commits follow Conventional Commits. The pre-commit hook must pass, and `--no-verify` is forbidden.

---

## Phase 1: Setup (Shared Infrastructure) — Issue "Setup: tooling, quality gates, UI kit"

**Purpose**: a runnable empty app with all quality gates in place, before any feature code
(constitution: the Setup phase is the first PR).

- [x] T001 Initialize git repository and create public GitHub repo `MarkupChef/smart-sender-test` (`git init`, `gh repo create --public --source . --remote origin`), add `.gitignore` (node_modules, dist, coverage, `.env*`), commit existing `docs/`, `.specify/`, `specs/`, `.claude/`, `skills-lock.json`
- [x] T050 Create the six GitHub issues from the "GitHub delivery" table via `gh issue create` (one per phase; Phases 3 + 4 share #3), each with the checklist of its `T0xx` tasks (constitution Development Workflow). Added after task generation; runs right after T001 and before T002
- [x] T002 Scaffold Vite React-TS app in repo root (`pnpm create vite . --template react-ts`), set `"packageManager": "pnpm@12.14.0"` in `package.json`, add `.nvmrc` with `22.18.0` and `"engines": { "node": ">=22.12" }` in `package.json`; pin `typescript` to `~6.0.3` (research R1)
- [x] T003 Configure strict TypeScript in `tsconfig.app.json` and `tsconfig.node.json`: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `verbatimModuleSyntax`, `noEmit`, path alias `@/*` → `src/*` (also in `vite.config.ts`); `exactOptionalPropertyTypes` stays off
- [x] T004 Add `package.json` scripts: `dev`, `build`, `preview`, `typecheck` (`tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.node.json --noEmit` — the constitution's `tsc --noEmit` run on each project, without build mode), `lint` (`eslint . --max-warnings 0`), `test` (`vitest run`), `format` (`prettier --write .`)
- [x] T005 Configure ESLint flat config in `eslint.config.js`: `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked` with `projectService`, `eslint-plugin-react-hooks` (recommended), `eslint-config-prettier`; rule `@typescript-eslint/consistent-type-assertions: ['error', { assertionStyle: 'never' }]` (allows `as const`); ban `@ts-ignore`; `no-restricted-imports` zones: `src/api/**` cannot import `react`, `@tanstack/*`, `@/features/*`, `@/app/*`, `@/mocks/*` — except `src/api/**/*.test.ts`, which may import `@/mocks/server` and `@/mocks/db` (separate config block with `files: ['src/api/**/*.test.ts']`; one shared mock per Principle V); each `src/features/<name>/**` cannot import any other feature (one block per feature dir, generated from `src/features/*` so new features are covered automatically); `src/mocks/**` may import only `@/api/schemas`; `src/features/**` and `src/shared/**` cannot import `@/mocks/*` or `@/app/*` (`src/main.tsx` is the entry point, not UI code, and is the only non-test file allowed to import `@/mocks/browser` — enforced by its own block); every zone bans both `@/` aliases and relative specifiers (matched by path segment, since `no-restricted-imports` does not resolve paths); the `src/mocks/**` rule restricts `@/` aliases only — `msw` packages and relative imports between mock files are allowed; ignore `src/shared/ui/**` from strict style rules only if generated shadcn code fails them
- [x] T006 [P] Configure Prettier in `.prettierrc` (`singleQuote`, `semi`, `printWidth: 100`, `trailingComma: 'all'`) and `.prettierignore` (`dist`, `pnpm-lock.yaml`, `public/mockServiceWorker.js`, `specs`, `.specify`)
- [x] T007 Configure Vitest in `vitest.config.ts` (merge Vite config, `environment: 'node'`, `include: ['src/**/*.test.ts']`) and add a placeholder `src/api/http-client.test.ts` with one passing `it.todo` so `pnpm test` exits 0
- [x] T008 Install and configure husky + lint-staged: `.husky/pre-commit` runs `pnpm exec lint-staged && pnpm typecheck && pnpm test`; `lint-staged` in `package.json`: `*.{ts,tsx,js}` → `prettier --write`, `eslint --fix --max-warnings 0 --no-warn-ignored` (staged ESLint-ignored files such as `public/mockServiceWorker.js` must not count as warnings); `*.{css,md,json,yml,html}` → `prettier --write`
- [x] T009 [P] Add CI workflow `.github/workflows/ci.yml`: on `pull_request` and `push` to `main`; `actions/checkout`, `pnpm/action-setup`, `actions/setup-node` with `node-version-file: .nvmrc` and pnpm cache; `pnpm install --frozen-lockfile` (shared via the local composite action `.github/actions/setup`); top-level `permissions: contents: read`; the `lint` job also runs `prettier --check .`; **three separate jobs whose ids are exactly `typecheck`, `lint`, `test`**. These names are required status checks in the `main` branch protection, so renaming a job blocks every merge
- [x] T010 Install Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/vite`) and init shadcn/ui (`components.json` aliases exactly: `components: '@/shared'`, `ui: '@/shared/ui'`, `lib: '@/shared'`, `utils: '@/shared/cn'`, `hooks: '@/shared'` — so generated primitives land in `src/shared/ui/` and `cn` lives in `src/shared/cn.ts`, no `lib/`/`utils/` folders); add components: `button`, `input`, `label`, `table`, `card`, `skeleton`, `alert`, `sonner`, `pagination` into `src/shared/ui/`
- [x] T011 Create brand theme `src/shared/theme.css` imported from `src/main.tsx`: map tokens to shadcn CSS variables — `--primary: #1380F6` (hover `#2276D2` as `--primary-hover`), `--foreground: #232323`, `--muted-foreground: #595959`, `--background: #FFFFFF`, `--card: #FFFFFF`, `--muted: #F6F7F9`, `--secondary: #FAFAFA`, `--border`/`--input: #E9ECEF`, `--destructive: #EB5757`, `--success: #40C057`; `--radius: 0.5rem`; light theme only (remove `.dark` block); fonts from `@fontsource/montserrat` (600, 700 — headings, buttons) and `@fontsource/open-sans` (400, 600 — body); make `button` variant pill-shaped (`rounded-full`) in `src/shared/ui/button.tsx`
- [x] T012 Replace Vite demo content: `src/main.tsx` renders a placeholder `<App/>` from `src/app/app.tsx`; delete `src/App.css`, `src/assets/*`, demo `index.css` content; set `<html lang="uk">` and `<title>Smart Sender — Вебхуки</title>` in `index.html`; verify `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all pass

**Checkpoint**: an empty branded app builds. The pre-commit hook and CI both run typecheck, lint
and test.

---

## Phase 2: Foundational — Issue "Transport layer, mock API and required session test"

**Purpose**: contract schemas, the MSW mock and the `fetch` transport (CSRF and single-flight
rotate), test-first. **This blocks all user stories.**

- [x] T013 [P] Define zod schemas in `src/api/schemas.ts` per data-model.md: `userSchema` (`id` int, `email` email, `first_name`, `last_name`, `name` strings); `webhookSchema` (`id` int, `name` string, `url` string, `active` boolean, `created_at` string ISO); `webhookListSchema` (`data: webhookSchema[]`, `paging: { pages: { current: int≥1, last: int≥1 }, results: { total: int≥0, limitation: int≥1 } }`); `errorEnvelopeSchema` (`error: { type: enum[BadRequestException, AuthenticationException, NotFoundException, TokenMismatchException, ValidationException], message: string, payload?: Record<string, string[]> }`, with `payload` `null` → `undefined`); `loginResponseSchema` (`device_session_token` string); input schemas `loginInputSchema` (`email`: email format, `password`: "password non-empty") and `webhookInputSchema` (`name`: "name trimmed non-empty", `url`: "url `http(s)://` valid URL" — validate with `URL` parse + protocol `http:`/`https:`); export `z.infer` types `User`, `Webhook`, `WebhookList`, `LoginInput`, `WebhookInput`
- [x] T014 [P] Implement `src/api/api-error.ts`: `ApiErrorInfo` discriminated union by `type` exactly as in data-model.md (`BadRequestException`, `AuthenticationException`, `NotFoundException`, `TokenMismatchException`, `ValidationException` with `fields: Record<string, string[]>`, `NetworkError`, `SchemaMismatch` with `issues`, `UnknownError` with `status`); `class ApiError extends Error { readonly info: ApiErrorInfo }`; `isApiError(e): e is ApiError` guard; `async toApiError(response: Response): Promise<ApiError>` parsing the error envelope (falls back to `UnknownError`)
- [x] T015 [P] Implement `src/api/fingerprint.ts`: `getFingerprint(): string` reads `localStorage['fingerprint']`, validates `/^[0-9a-f]{32}$/`, otherwise generates from `crypto.getRandomValues(new Uint8Array(16))` → hex, stores and returns; wrap storage access in try/catch (fallback: keep generated value in a module variable)
- [x] T016 Implement in-memory mock state `src/mocks/db.ts`: fixed user (`admin@smartsender.test` / `password123`, `first_name: 'Олена'`, `last_name: 'Коваль'`, `name: 'Олена Коваль'` — shown in the header and checked in the manual checklist), 28 deterministic webhooks (ids 1–28, varied names like `Order created`, `Payment hook`, `CRM sync`…, mix of `active`, fixed ISO `created_at`, stable order by `id`), `deviceTokens: Map<string, string>`, `session: { fingerprint: string; expiresAt: number } | undefined`, `CSRF_TOKEN` constant, mutable `sessionTtlMs` field (default `30_000`, restored by `resetDb()`; Principle V "TTL is configurable" — tests still use `expireSession()` instead of short TTLs or fake timers); helpers `resetDb()`, `expireSession()` (sets `expiresAt` to `Date.now() - 1`), `endSession()` (clears session), `failNextUpdate()` (one-shot flag: the next valid `PUT /v1/webhooks/:id` returns 422 with `payload.url: ['The url must be a valid URL.']`; cleared by `resetDb()`); imports only types from `@/api/schemas`
- [x] T017 Implement contract handlers `src/mocks/handlers.ts` as `createHandlers(baseUrl: string)` using `http`/`HttpResponse` from `msw/http` and `delay` from `msw/utils/delay`, per contracts/http-api.md: every handler rejects a missing `X-Requested-With: XMLHttpRequest` with 400; POST/PUT check `X-CSRF-TOKEN === CSRF_TOKEN` **first** → 419 `TokenMismatchException`; `GET /csrf` → 204 + header; `/auth/login` requires non-empty `X-Captcha-Token` (else 422 `payload.captcha`), validates required fields (`The email field is required.`, `The password field is required.`), wrong creds → 422 `payload.password: ['These credentials do not match our records.']`, success → random token stored in `deviceTokens` with fingerprint; `/auth/token/issue` consumes token, fingerprint must match (else 422), starts session `expiresAt = now + sessionTtlMs`; `/auth/token/rotate` → 400 if no session or fingerprint mismatch, else `expiresAt = now + sessionTtlMs` (works even when expired); `/auth/token/revoke` → clears session, 204, idempotent; protected `GET /v1/me`, `GET /v1/webhooks` (page default 1, limit default 10, case-insensitive substring of `name`, `total` after search, `last = max(1, ceil(total/limit))`, page beyond last → empty `data`), `GET /v1/webhooks/:id` (404 `NotFoundException`), `PUT /v1/webhooks/:id` (order: CSRF → session → existence → validation, including the `failNextUpdate` one-shot flag: `The name field is required.`, `The url must be a valid URL.`) → 401 `AuthenticationException` when `!session || now >= expiresAt`; all errors use the envelope; add `await delay()` in data handlers (no-op in Node)
- [x] T018 [P] Create `src/mocks/server.ts` exporting `server = setupServer(...createHandlers(TEST_BASE_URL))` with `TEST_BASE_URL = 'http://localhost'`
- [x] T019 [P] Create `src/mocks/browser.ts` exporting `startMockWorker()`: `setupWorker(...createHandlers(window.location.origin)).start({ onUnhandledFrame: 'bypass' })` and, only when `import.meta.env.DEV`, assigns `window.__mock = { endSession, expireSession, failNextUpdate }` (declare the global type in `src/mocks/browser.ts` via `declare global`); generate `public/mockServiceWorker.js` with `pnpm dlx msw init public --save`
- [x] T020 Write the **required** test first in `src/api/http-client.test.ts` (it must fail before T021): `server.listen({ onUnhandledFrame: 'error' })`, `resetDb()` in `beforeEach`, `server.resetHandlers()`/`close()`; count rotate calls via `server.events.on('request:start', ({ request }) => ...)` filtered by `new URL(request.url).pathname === '/auth/token/rotate'`; scenario: create client with `onSessionExpired = vi.fn()`, sign in through real endpoints (`login` → `issueSession`), call `expireSession()`, run `Promise.all([getMe(), listWebhooks({ page: 1, search: '' })])`; assert rotate count `=== 1`, both results parse (me email equals fixture, list has 10 items), `onSessionExpired` not called; no fake timers, no `as`. **Commit rule**: the pre-commit hook runs typecheck + test and `--no-verify` is forbidden, so the red state is checked locally (`pnpm test` fails) but never committed; the first commit containing this test lands together with T021–T022, already green
- [x] T021 Implement transport `src/api/http-client.ts` per research R5 and contracts/http-client.md: `createHttpClient({ baseUrl, onSessionExpired })` returns `{ request }` with two overloads sharing `opts: { method: 'GET'|'POST'|'PUT'; path: string; body?: unknown; auth: 'session'|'none'; captcha?: boolean }` — `request<T>(opts & { schema: ZodType<T> }): Promise<T>` (body parsed with the schema) and `request(opts): Promise<undefined>` (no schema → body ignored, nothing unvalidated reaches callers; FR-024); closure state `csrfPromise` and `rotatePromise` (single-flight, `rotatePromise` cleared in `finally`, `csrfPromise` reset on failure/419 only if it is still the promise the request used, so concurrent 419s refetch once; a `completedRotations` counter is read before each send, and a 401 for a request sent before the latest rotate completed is retried without a new rotate); every request sends `X-Requested-With: XMLHttpRequest`, JSON `Content-Type` when body, `X-CSRF-TOKEN` on POST/PUT (awaits `ensureCsrf()` before the first non-csrf request), `X-Captcha-Token: 'dev-captcha'` when `captcha`; on 419 once → reset CSRF + retry; on 401 with `auth: 'session'` once → `await rotateOnce()` → retry; rotate is sent with `auth: 'none'` body `{ fingerprint: getFingerprint() }`; rotate failure → `onSessionExpired()` is called **once, inside `rotateOnce()`** (in its `catch`, before rejecting the shared promise) and every waiter then throws `ApiError(AuthenticationException)` without calling it again; a repeated 401 after a successful rotate → `onSessionExpired()` + throw `ApiError(AuthenticationException)`; `fetch` rejection → `NetworkError`; non-2xx → `toApiError`; 204/empty → `undefined`; parse success body with `schema` → mismatch throws `SchemaMismatch` (+ `console.error` when `import.meta.env.DEV`); short comment documenting single-flight and "rotate never rotates" guarantees; keep file ≤ ~150 lines
- [x] T022 Implement typed endpoints `src/api/endpoints.ts` as `createEndpoints(client)` (or functions taking the client) per contracts/http-client.md: `login(input)` (captcha, `auth: 'none'`), `issueSession({ device_session_token })`, `revokeSession()` — all three add `fingerprint: getFingerprint()` to the body (contracts/http-api.md, FR-004), `getMe()`, `listWebhooks({ page, search })` (query `page`, `limit=10`, `search` omitted when empty), `getWebhook(id)`, `updateWebhook(id, input)`; all session endpoints use `auth: 'session'`, all auth endpoints `auth: 'none'`; export `type Api = ReturnType<typeof createEndpoints>`; verify T020 passes (`pnpm test`)
- [x] T051 Add the rotate-safety tests to `src/api/http-client.test.ts` (same setup and rotate counter as T020; written before the T021 code they check, committed green together with T021–T022): (G6) sign in, `endSession()`, then `getMe()` → rotate returns 400 → exactly one rotate, `onSessionExpired` called once, the promise rejects with `ApiError` `AuthenticationException`; (G5/G6) `server.use()` override making `GET /v1/me` always 401 → exactly one rotate (the retry's 401 does not start a second one), `onSessionExpired` called once, rejects with `AuthenticationException`. Promoted from the optional set (contracts/http-client.md G5/G6)

**Checkpoint**: `pnpm test` is green with the required 2×401 → 1 rotate test and the G5/G6
rotate-safety tests. The mock serves the full contract.

---

## Phase 3: User Story 1 — Sign in and reach the webhook list (Priority: P1) 🎯 MVP

**Goal**: valid credentials lead to the webhooks route with the user's name shown. A wrong
password shows a field error. No tokens are stored anywhere.

**Independent Test**: `pnpm dev` → sign in with `admin@smartsender.test` / `password123` →
`/webhooks` placeholder and name in the header. A wrong password shows a message under the
password field. `localStorage` contains only `fingerprint`.

- [ ] T023 [P] [US1] Create `src/app/query-client.ts`: `new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false }, mutations: { retry: false } } })` (research R11)
- [ ] T024 [P] [US1] Create `src/features/auth/me-query.ts`: `meQueryKey = ['me'] as const`, `meQueryOptions(api)` using `getMe`, `staleTime: Infinity`
- [ ] T025 [US1] Create `src/app/http.ts`: the single `createHttpClient({ baseUrl: window.location.origin, onSessionExpired })` instance and `api = createEndpoints(client)`; `api` is passed into the router context (T028, T030) and is **never imported by features** (T005 forbids `features → app`) — features read it via `useRouteContext({ from: '__root__' })`, typed through the router `Register` declaration; `onSessionExpired` is a late-bound callback set by the router module (`setSessionExpiredHandler(fn)`) to avoid an import cycle; the handler itself is implemented in T031
- [ ] T026 [US1] Implement `src/features/auth/use-login.ts`: `useMutation` whose `mutationFn` runs `login({ email, password })` → `issueSession({ device_session_token })` with the token kept as a **local variable only** → `queryClient.fetchQuery(meQueryOptions(api))`; returns the mutation; no token in state/URL/storage (FR-003)
- [ ] T027 [US1] Implement `src/features/auth/login-page.tsx`: react-hook-form + `zodResolver(loginInputSchema)`, fields `email` / `password` with `<Label htmlFor>`, `aria-invalid`, `aria-describedby` error ids; submit disabled while `isPending`; on `ApiError` `ValidationException` map `fields[name][0]` to `setError` for `email`/`password`, other fields or messages to `setError('root.server')`; other `ApiError` types → root error "Не вдалося увійти. Спробуйте ще раз." (exhaustive switch with `satisfies never`; `AuthenticationException` and `TokenMismatchException` are **not** handled separately — they share one fall-through branch with the other non-422 types and a comment "owned by the transport (Principle III)"; resubmitting is the retry, see plan.md Complexity Tracking); on success, if `search.redirect` is same-origin — `const target = new URL(redirect, window.location.origin)` and `target.origin === window.location.origin` — `navigate({ href: target.pathname + target.search, replace: true })` (a prefix check alone misses `/\evil.com`, which browsers read as `//evil.com`; `href`, because `redirect` carries the query string, which `to` does not parse), else `navigate({ to: '/webhooks', replace: true })`; show banner "Сесія завершилась. Увійдіть знову." when `search.reason === 'expired'`; Ukrainian labels "Email", "Пароль", button "Увійти"
- [ ] T028 [US1] Implement `src/app/router.tsx` (code-based TanStack Router, `createRootRouteWithContext<{ queryClient: QueryClient; api: Api }>()`): `/` → redirect `/webhooks`; `/login` with `validateSearch` zod `{ redirect?: string, reason?: 'expired' }` (invalid → dropped) and `beforeLoad` redirecting to `/webhooks` when `queryClient.getQueryData(meQueryKey)` exists; pathless protected layout route with `beforeLoad` that throws `redirect({ to: '/login', search: { redirect: location.href } })` when `me` is not cached, otherwise returns `{ me }` into the route context (research R6, R7); `/webhooks` child with a temporary placeholder component; register router type (`declare module '@tanstack/react-router'`)
- [ ] T029 [US1] Implement `src/app/protected-layout.tsx`: header with text wordmark "Smart Sender", `me.name` from `Route.useRouteContext()` (no query observer on `me`, so nothing can refetch it while signing out — research R7), and `<Outlet/>`; logout button placeholder wired in US2
- [ ] T030 [US1] Wire `src/app/app.tsx` (`QueryClientProvider`, `RouterProvider` with `context: { queryClient, api }`, `<Toaster/>` from `src/shared/ui/sonner.tsx`) and `src/main.tsx` (`await startMockWorker()` before render **unconditionally** — the app has no real backend, so `pnpm dev`, `pnpm preview` and any deployed demo all run on MSW; only `window.__mock` stays dev-only, see T019)

**Checkpoint**: US1 is fully functional, and sign-in can be shown as a demo.

---

## Phase 4: User Story 2 — Session stays alive transparently and ends cleanly (Priority: P1)

**Goal**: silent rotate while working. Rotate failure leads to login with "Сесія завершилась", and
logout clears everything.

**Independent Test**: after sign-in, wait more than 30 s and navigate, and nothing visible happens
(Network shows `401 → rotate → retry`). Running `__mock.endSession()` and then navigating leads to
`/login` with the banner. "Вийти" opens `/login`, and Back does not reveal data.

- [ ] T031 [US2] Implement the session-expired handler in `src/app/router.tsx` (registered via `setSessionExpiredHandler` from `src/app/http.ts`): `await queryClient.cancelQueries()` → `queryClient.removeQueries({ queryKey: meQueryKey })` → `await router.navigate({ to: '/login', search: { reason: 'expired', redirect: router.state.location.href } })` → `queryClient.clear()` (the protected tree is already unmounted, so no mounted query can refetch and trigger another 401); idempotent: the call is ignored when the module flag `expiryInProgress` is set **or** `queryClient.getQueryData(meQueryKey)` is `undefined` (already signed out); otherwise the flag is set at the start and reset in `finally` after `queryClient.clear()` — no reset hook in `features/auth` is needed (features never import `app`), and a later expiry after a new login is handled again (FR-008, research R7)
- [ ] T032 [US2] Implement `src/features/auth/use-logout.ts`: `useMutation` calling `revokeSession()`; in `onSettled` (success **or** error) → `await queryClient.cancelQueries()` → `queryClient.removeQueries({ queryKey: meQueryKey })` → `await navigate({ to: '/login', replace: true })` → `queryClient.clear()` (same order as T031; research R7) (FR-009, spec edge case "sign-out request fails")
- [ ] T033 [US2] Add "Вийти" button to `src/app/protected-layout.tsx` using `useLogout`, disabled while pending
- [ ] T034 [US2] Verify that the guard in `src/app/router.tsx` re-runs after `queryClient.clear()` (navigating to a protected route after logout/expiry redirects to `/login`), and that reload on `/webhooks?page=2&search=hook` → `/login?redirect=...` → after sign-in returns to the same URL (FR-010, US1-5); after "Вийти" the Network tab shows no `/v1/me` and no `/auth/token/rotate` request and the login screen has no "Сесія завершилась" banner

**Checkpoint**: US1 and US2 both work. The core evaluated session behaviour is complete.

---

## Phase 5: User Story 3 — Browse and search webhooks (Priority: P2)

**Goal**: a table with 10 items per page, pagination, and debounced search. Page and search live
in the URL and survive reload and back/forward. Loading, empty and error states are shown.

**Independent Test**: search `hook`, go to page 2, reload, and the view is the same. Back/forward
restore the previous views. A new search resets to page 1. `?page=abc` opens page 1. `zzzz` shows
the empty state. Offline mode shows the error with "Повторити".

- [ ] T035 [P] [US3] Create `src/features/webhooks/list-search.ts`: `listSearchSchema = z.object({ page: z.number().int().min(1).catch(1), search: z.union([z.string(), z.number()]).transform(String).pipe(z.string().trim().max(100)).catch('') })` with defaults `{ page: 1, search: '' }`, exported type `ListSearch`, and `listSearchDefaults` for `stripSearchParams` (data-model "List search params"); the union is needed because the router's default JSON search parser turns a hand-typed `?search=123` into a number
- ~~T036~~ removed: debounce is written inline in T040 (one usage; Principle I — no abstraction before the 3rd repetition)
- ~~T037~~ removed: the error state is written inline in T041 and T045 (two usages; Principle I)
- [ ] T038 [US3] Create `src/features/webhooks/webhook-queries.ts`: `webhookListQueryOptions(api, { page, search })` with key `['webhooks', 'list', { page, search }]` and `placeholderData: keepPreviousData`; `webhookDetailQueryOptions(api, id)` with key `['webhooks', 'detail', id]` (detail used in US4)
- [ ] T039 [US3] Register `/webhooks` in `src/app/router.tsx` with `validateSearch: listSearchSchema` and `search: { middlewares: [stripSearchParams(listSearchDefaults)] }`, replacing the placeholder with `WebhooksPage`
- [ ] T040 [US3] Implement `src/features/webhooks/webhook-search-input.tsx`: local `draft` initialised from URL `search`; inline debounce: a `useEffect` on `draft` with `setTimeout(300)` + cleanup; when the debounced value differs from URL `search` → `navigate({ search: { search: debounced, page: 1 }, replace: true })`; effect re-syncs `draft` when URL `search` changes externally (back/forward) and differs from the debounced draft (research R8); labelled input "Пошук за назвою"
- [ ] T041 [US3] Implement `src/features/webhooks/webhooks-page.tsx`: reads `page`/`search` from `Route.useSearch()` (never mirrored into `useState`), `useQuery(webhookListQueryOptions)`; states: initial loading → `Skeleton` rows; error → inline shadcn `Alert` with the message + "Повторити" `Button` calling `refetch`; empty (`data.length === 0`) → "Нічого не знайдено" (+ "На першу сторінку" link when `page > 1`); success → semantic `<table>` (shadcn `Table`) with columns "Назва" (a `<Link to="/webhooks/$webhookId" params search={{ page, search }}>`), "URL", "Активність" ("Активний"/"Неактивний" badge using success/muted tokens); pagination from `paging.pages` with prev/next + page numbers via `<Link search={(prev) => ({ ...prev, page })}>` (push); show subtle fetching indicator while `isPlaceholderData`; keep file ≤ ~150 lines (extract `webhooks-table.tsx` if needed)

**Checkpoint**: US1–US3 work. URL state behaves correctly on reload and back/forward.

---

## Phase 6: User Story 4 — Edit a webhook (Priority: P3)

**Goal**: an edit screen for name and URL with client and server field errors, a not-found state, a
success toast, and a return to the same list view.

**Independent Test**: open a webhook, then clear the name (error) and enter `ftp://x` (error).
`__mock.failNextUpdate()` followed by a valid save shows the server message under the URL field. A
valid save shows the "Збережено" toast and returns to the same list page with the updated row.
`/webhooks/9999` shows "Вебхук не знайдено".

- [ ] T042 [US4] Add `useUpdateWebhook(id)` to `src/features/webhooks/webhook-queries.ts`: `useMutation(updateWebhook)`; `onSuccess` → `queryClient.setQueryData(['webhooks','detail',id], updated)` and `invalidateQueries({ queryKey: ['webhooks','list'] })`
- [ ] T043 [US4] Register `/webhooks/$webhookId` in `src/app/router.tsx` under the protected layout: `params.parse` returns `{ webhookId: number | undefined }` (`undefined` when not a positive int — `params.parse` never throws, so the route error component is not involved; `params.stringify` writes the number back), `validateSearch: listSearchSchema` (same list params, research R9) and the same `search: { middlewares: [stripSearchParams(listSearchDefaults)] }` as T039, so edit URLs do not carry default `?page=1&search=`
- [ ] T044 [US4] Implement `src/features/webhooks/webhook-edit-form.tsx`: react-hook-form + `zodResolver(webhookInputSchema)` with `defaultValues` from the webhook; fields "Назва" / "URL" with `<Label htmlFor>`, `aria-invalid`, `aria-describedby`; submit "Зберегти" disabled while `isPending`; "Скасувати" link back to `/webhooks` with list params; on `ValidationException` map `fields.name`/`fields.url` `[0]` → `setError`, unknown fields/message → `setError('root.server')`; other `ApiError` types → root error (exhaustive switch with `satisfies never`; `AuthenticationException` / `TokenMismatchException` share one fall-through branch with the other non-422 types, commented as transport-owned — same as T027; resubmitting is the retry, see plan.md Complexity Tracking); on success → `toast.success('Збережено')` and `navigate({ to: '/webhooks', search: { page, search } })`
- [ ] T045 [US4] Implement `src/features/webhooks/webhook-edit-page.tsx`: `webhookId === undefined` → not-found state immediately (no request; the detail query is only created for a defined id, e.g. a child component receiving `id: number`); `useQuery(webhookDetailQueryOptions)`; loading → skeleton; `ApiError` `NotFoundException` → "Вебхук не знайдено" + link "До списку вебхуків" (with list params); other errors → inline shadcn `Alert` + "Повторити" `Button` calling `refetch`; success → card with read-only "Активність" + `WebhookEditForm`; "← До списку" link preserving `page`/`search`

**Checkpoint**: all user stories work independently.

---

## Phase 7: Polish & Cross-Cutting — Issue "Extra transport tests, README, final gate"

**Purpose**: optional transport guarantees, documentation and the final quality gate.

- [ ] T046 [P] Add optional transport tests to `src/api/http-client.test.ts` (single-call G5/G6 are already required in T051): (G6, concurrent) `endSession()` + `Promise.all` of two protected calls → exactly one rotate, `onSessionExpired` called **once**, both reject with `AuthenticationException`; (G7) override returning 419 once for `PUT /v1/webhooks/1` → exactly two `GET /csrf` calls total and update succeeds; (G2) two parallel first calls → one `GET /csrf`
- [ ] T047 [P] Write `README.md` (Ukrainian or English, consistent): how to run (pnpm 12 via `npm i -g pnpm` or `corepack enable`; `pnpm install`, `pnpm dev`) and test (`pnpm test`); test credentials `admin@smartsender.test` / `password123`; key decisions with references to `.specify/memory/constitution.md` (transport single-flight, URL as state owner, `me` cache as auth signal, mock session in memory instead of cookies, TS 6 pin, form-level root error as the retry for non-422 mutation failures — plan.md Complexity Tracking); manual validation checklist from `specs/001-webhooks-admin-app/quickstart.md`; "Not done / trade-offs" (no UI/e2e tests, server 422 on edit reproducible only via dev `__mock.failNextUpdate()` because client mirrors server rules, no network retry, re-login after reload); "How it would scale" (OpenAPI codegen, i18n, e2e with Playwright, monorepo when needed); actual time spent; honest note that development was spec-driven with Claude Code + Spec Kit
- [ ] T048 Self-review against the constitution: grep `src/` for `any`, ` as ` (except `as const`), `!.`, `@ts-ignore`, `null`, `localStorage` (only in `src/api/fingerprint.ts`), direct `fetch` (only in `src/api/http-client.ts`); check files > 150 lines and nesting depth; fix findings
- [ ] T049 Run final quality gate `pnpm typecheck && pnpm lint && pnpm test && pnpm build` with zero errors and warnings, then walk through the quickstart.md manual checklist in the browser and record any gaps in README "Not done"

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** has no dependencies and is the first PR.
- **Foundational (Phase 2)** depends on Setup and **blocks all stories**. T020 (test) comes before T021 (implementation).
- **US1 (Phase 3)** depends on Foundational.
- **US2 (Phase 4)** depends on US1, because it needs the router, login and the protected layout.
- **US3 (Phase 5)** depends on US1 (protected route and layout). It is independent of US2.
- **US4 (Phase 6)** depends on US3 (`list-search.ts`, `webhook-queries.ts`, the list link).
- **Polish (Phase 7)**: technically T046 only needs Phase 2, but it belongs to issue #6, so it is
  done on `feat/6-polish-readme` after #5 is merged. T047–T049 come after all stories.

### Story completion order

```text
Setup → Foundational → US1 → ┬→ US2
                             └→ US3 → US4 → Polish
```

### Within phases

- T013, T014 and T015 run in parallel. T016 → T017 → (T018 ∥ T019). T020 → T051 → T021 → T022 (test-first locally; the first commit with T020/T051 must already be green).
- US1: T023 ∥ T024, then T025 → T026 → T027 → T028 → T029 → T030.
- US3: T035, then T038 → T039 → T040 → T041.
- US4: T042 → T043 → T044 → T045.

### Parallel Opportunities

- Setup: T006 and T009 touch only their own config files and can run in parallel. T005 and T007
  install dev dependencies, so they run one after another (concurrent installs would both rewrite
  `package.json` and `pnpm-lock.yaml`); the same applies to T008 and T010.
- Foundational: the schemas, ApiError and fingerprint (T013–T015). The browser and server mock entry points (T018, T019).
- US2 and US3 are logically independent, but not parallel in delivery: US1 + US2 ship as one PR
  (#3), and every branch is created from `main` after the previous PR is merged manually. So
  `feat/4-webhook-list` starts only after #3 is on `main`; no stacked branches.
- Polish: T046 (tests) ∥ T047 (README), both on `feat/6-polish-readme`.

---

## Parallel Example: Foundational

```bash
Task: "Define zod schemas in src/api/schemas.ts"
Task: "Implement ApiError in src/api/api-error.ts"
Task: "Implement getFingerprint in src/api/fingerprint.ts"
```

---

## Implementation Strategy

### MVP first (constitution Principle II)

1. Setup, then Foundational. The required test must be green. This is the evaluated core.
2. US1 + US2: sign-in and the full session lifecycle. **Stop and validate** (quickstart steps 1–5).
3. US3 → US4 → Polish, in priority order. If the 4-hour budget runs out, list the remaining items
   in README "Not done".

### GitHub delivery (constitution Development Workflow)

| Issue | Phase | Tasks | Branch |
| --- | --- | --- | --- |
| #1 | Setup | T001, T050, T002–T012 | `feat/1-setup` |
| #2 | Foundational | T013–T022, T051 | `feat/2-transport-mock` |
| #3 | US1 + US2 (P1) | T023–T034 | `feat/3-auth-session` |
| #4 | US3 (P2) | T035, T038–T041 | `feat/4-webhook-list` |
| #5 | US4 (P3) | T042–T045 | `feat/5-webhook-edit` |
| #6 | Polish | T046–T049 | `feat/6-polish-readme` |

US1 and US2 share one issue because both are P1 and both edit the same router and layout files.
Each PR has `Closes #n`, a decision summary, a self-review and green CI. **The repository owner
merges manually.**

---

## Notes

- `[P]` means different files and no dependency on incomplete tasks.
- Commit after each task or logical group using Conventional Commits.
- Stop at any checkpoint to validate the story independently.
- `tasks.md` is the source of truth. GitHub issues mirror its checklists.
