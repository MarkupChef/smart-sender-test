---

description: "Task list for Webhooks Admin App (Smart Sender Senior Frontend Test)"
---

# Tasks: Webhooks Admin App (Smart Sender Senior Frontend Test)

**Input**: Design documents from `specs/001-webhooks-admin-app/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: The spec requires one automated test (FR-030), and the constitution (Principle V)
requires the transport to be written test-first. Transport tests live in Phase 2. Optional extra
transport tests (G5–G7) are in the Polish phase. There are no UI/e2e tests; this is a documented
trade-off.

**Organization**: tasks are grouped by user story. Per the constitution's Development Workflow, each
phase becomes **one GitHub issue**, and each issue becomes one branch `feat/<n>-<slug>` and one PR.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: US1–US4 from spec.md
- All paths are relative to the repository root (a single Vite project, `src/` per plan.md)

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

- [ ] T001 Initialize git repository and create public GitHub repo `MarkupChef/smart-sender-test` (`git init`, `gh repo create --public --source . --remote origin`), add `.gitignore` (node_modules, dist, coverage, `.env*`), commit existing `docs/`, `.specify/`, `specs/`, `.claude/`, `skills-lock.json`
- [ ] T002 Scaffold Vite React-TS app in repo root (`pnpm create vite . --template react-ts`), set `"packageManager": "pnpm@12.14.0"` in `package.json`, add `.nvmrc` with `22.18.0` and `"engines": { "node": ">=22.12" }` in `package.json`; pin `typescript` to `~6.0.3` (research R1)
- [ ] T003 Configure strict TypeScript in `tsconfig.app.json` and `tsconfig.node.json`: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `verbatimModuleSyntax`, `noEmit`, path alias `@/*` → `src/*` (also in `vite.config.ts`); `exactOptionalPropertyTypes` stays off
- [ ] T004 Add `package.json` scripts: `dev`, `build`, `preview`, `typecheck` (`tsc -b --noEmit` or `tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.node.json --noEmit`), `lint` (`eslint . --max-warnings 0`), `test` (`vitest run`), `format` (`prettier --write .`)
- [ ] T005 [P] Configure ESLint flat config in `eslint.config.js`: `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked` with `projectService`, `eslint-plugin-react-hooks` (recommended), `eslint-config-prettier`; rule `@typescript-eslint/consistent-type-assertions: ['error', { assertionStyle: 'never' }]` (allows `as const`); ban `@ts-ignore`; `no-restricted-imports` zones: `src/api/**` cannot import `react`, `@tanstack/*`, `@/features/*`, `@/app/*`, `@/mocks/*`; `src/features/auth/**` cannot import `@/features/webhooks/*` and vice versa; `src/mocks/**` may import only `@/api/schemas`; `src/features/**` and `src/shared/**` cannot import `@/mocks/*` or `@/app/*`; ignore `src/shared/ui/**` from strict style rules only if generated shadcn code fails them
- [ ] T006 [P] Configure Prettier in `.prettierrc` (`singleQuote`, `semi`, `printWidth: 100`, `trailingComma: 'all'`) and `.prettierignore` (`dist`, `pnpm-lock.yaml`, `public/mockServiceWorker.js`, `specs`, `.specify`)
- [ ] T007 [P] Configure Vitest in `vitest.config.ts` (merge Vite config, `environment: 'node'`, `include: ['src/**/*.test.ts']`) and add a placeholder `src/api/http-client.test.ts` with one passing `it.todo` so `pnpm test` exits 0
- [ ] T008 Install and configure husky + lint-staged: `.husky/pre-commit` runs `pnpm exec lint-staged && pnpm typecheck && pnpm test`; `lint-staged` in `package.json`: `*.{ts,tsx}` → `prettier --write`, `eslint --fix --max-warnings 0`; `*.{css,md,json}` → `prettier --write`
- [ ] T009 [P] Add CI workflow `.github/workflows/ci.yml`: on `pull_request` and `push` to `main`; `actions/checkout`, `pnpm/action-setup`, `actions/setup-node` with `node-version-file: .nvmrc` and pnpm cache; `pnpm install --frozen-lockfile`; jobs/steps `typecheck`, `lint`, `test`
- [ ] T010 Install Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/vite`) and init shadcn/ui (`components.json` with aliases `@/shared/ui` for components and `@/shared/lib` → use `@/shared` paths so `cn` lives in `src/shared/cn.ts`); add components: `button`, `input`, `label`, `table`, `card`, `skeleton`, `alert`, `sonner`, `pagination` into `src/shared/ui/`
- [ ] T011 Create brand theme `src/shared/theme.css` imported from `src/main.tsx`: map tokens to shadcn CSS variables — `--primary: #1380F6` (hover `#2276D2` as `--primary-hover`), `--foreground: #232323`, `--muted-foreground: #595959`, `--background: #FFFFFF`, `--card: #FFFFFF`, `--muted: #F6F7F9`, `--secondary: #FAFAFA`, `--border`/`--input: #E9ECEF`, `--destructive: #EB5757`, `--success: #40C057`; `--radius: 0.5rem`; light theme only (remove `.dark` block); fonts from `@fontsource/montserrat` (600, 700 — headings, buttons) and `@fontsource/open-sans` (400, 600 — body); make `button` variant pill-shaped (`rounded-full`) in `src/shared/ui/button.tsx`
- [ ] T012 Replace Vite demo content: `src/main.tsx` renders a placeholder `<App/>` from `src/app/app.tsx`; delete `src/App.css`, `src/assets/*`, demo `index.css` content; set `<html lang="uk">` and `<title>Smart Sender — Вебхуки</title>` in `index.html`; verify `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all pass

**Checkpoint**: an empty branded app builds. The pre-commit hook and CI both run typecheck, lint
and test.

---

## Phase 2: Foundational — Issue "Transport layer, mock API and required session test"

**Purpose**: contract schemas, the MSW mock and the `fetch` transport (CSRF and single-flight
rotate), test-first. **This blocks all user stories.**

- [ ] T013 [P] Define zod schemas in `src/api/schemas.ts` per data-model.md: `userSchema` (`id` int, `email` email, `first_name`, `last_name`, `name` strings); `webhookSchema` (`id` int, `name` string, `url` string, `active` boolean, `created_at` string ISO); `webhookListSchema` (`data: webhookSchema[]`, `paging: { pages: { current: int≥1, last: int≥1 }, results: { total: int≥0, limitation: int≥1 } }`); `errorEnvelopeSchema` (`error: { type: enum[BadRequestException, AuthenticationException, NotFoundException, TokenMismatchException, ValidationException], message: string, payload?: Record<string, string[]> }`, with `payload` `null` → `undefined`); `loginResponseSchema` (`device_session_token` string); input schemas `loginInputSchema` (`email`: email format, `password`: "password non-empty") and `webhookInputSchema` (`name`: "name trimmed non-empty", `url`: "url `http(s)://` valid URL" — validate with `URL` parse + protocol `http:`/`https:`); export `z.infer` types `User`, `Webhook`, `WebhookList`, `LoginInput`, `WebhookInput`
- [ ] T014 [P] Implement `src/api/api-error.ts`: `ApiErrorInfo` discriminated union by `type` exactly as in data-model.md (`BadRequestException`, `AuthenticationException`, `NotFoundException`, `TokenMismatchException`, `ValidationException` with `fields: Record<string, string[]>`, `NetworkError`, `SchemaMismatch` with `issues`, `UnknownError` with `status`); `class ApiError extends Error { readonly info: ApiErrorInfo }`; `isApiError(e): e is ApiError` guard; `async toApiError(response: Response): Promise<ApiError>` parsing the error envelope (falls back to `UnknownError`)
- [ ] T015 [P] Implement `src/api/fingerprint.ts`: `getFingerprint(): string` reads `localStorage['fingerprint']`, validates `/^[0-9a-f]{32}$/`, otherwise generates from `crypto.getRandomValues(new Uint8Array(16))` → hex, stores and returns; wrap storage access in try/catch (fallback: keep generated value in a module variable)
- [ ] T016 Implement in-memory mock state `src/mocks/db.ts`: fixed user (`admin@smartsender.test` / `password123`, name `Олена Коваль` or similar), 28 deterministic webhooks (ids 1–28, varied names like `Order created`, `Payment hook`, `CRM sync`…, mix of `active`, fixed ISO `created_at`, stable order by `id`), `deviceTokens: Map<string, string>`, `session: { fingerprint: string; expiresAt: number } | undefined`, `CSRF_TOKEN` constant, `SESSION_TTL_MS = 30_000`; helpers `resetDb()`, `expireSession()` (sets `expiresAt` to `Date.now() - 1`), `endSession()` (clears session); imports only types from `@/api/schemas`
- [ ] T017 Implement contract handlers `src/mocks/handlers.ts` as `createHandlers(baseUrl: string)` using `http`/`HttpResponse` from `msw/http` and `delay` from `msw/utils/delay`, per contracts/http-api.md: every handler rejects a missing `X-Requested-With: XMLHttpRequest` with 400; POST/PUT check `X-CSRF-TOKEN === CSRF_TOKEN` **first** → 419 `TokenMismatchException`; `GET /csrf` → 204 + header; `/auth/login` requires non-empty `X-Captcha-Token` (else 422 `payload.captcha`), validates required fields (`The email field is required.`, `The password field is required.`), wrong creds → 422 `payload.password: ['These credentials do not match our records.']`, success → random token stored in `deviceTokens` with fingerprint; `/auth/token/issue` consumes token, fingerprint must match (else 422), starts session `expiresAt = now + SESSION_TTL_MS`; `/auth/token/rotate` → 400 if no session or fingerprint mismatch, else extends 30 s (works even when expired); `/auth/token/revoke` → clears session, 204, idempotent; protected `GET /v1/me`, `GET /v1/webhooks` (page default 1, limit default 10, case-insensitive substring of `name`, `total` after search, `last = max(1, ceil(total/limit))`, page beyond last → empty `data`), `GET /v1/webhooks/:id` (404 `NotFoundException`), `PUT /v1/webhooks/:id` (order: CSRF → session → existence → validation: `The name field is required.`, `The url must be a valid URL.`) → 401 `AuthenticationException` when `!session || now >= expiresAt`; all errors use the envelope; add `await delay()` in data handlers (no-op in Node)
- [ ] T018 [P] Create `src/mocks/server.ts` exporting `server = setupServer(...createHandlers(TEST_BASE_URL))` with `TEST_BASE_URL = 'http://localhost'`
- [ ] T019 [P] Create `src/mocks/browser.ts` exporting `startMockWorker()`: `setupWorker(...createHandlers(window.location.origin)).start({ onUnhandledFrame: 'bypass' })` and, in dev, assigns `window.__mock = { endSession }` (declare the global type in `src/mocks/browser.ts` via `declare global`); generate `public/mockServiceWorker.js` with `pnpm dlx msw init public --save`
- [ ] T020 Write the **required** test first in `src/api/http-client.test.ts` (it must fail before T021): `server.listen({ onUnhandledFrame: 'error' })`, `resetDb()` in `beforeEach`, `server.resetHandlers()`/`close()`; count rotate calls via `server.events.on('request:start', ({ request }) => ...)` filtered by `new URL(request.url).pathname === '/auth/token/rotate'`; scenario: create client with `onSessionExpired = vi.fn()`, sign in through real endpoints (`login` → `issueSession`), call `expireSession()`, run `Promise.all([getMe(), listWebhooks({ page: 1, search: '' })])`; assert rotate count `=== 1`, both results parse (me email equals fixture, list has 10 items), `onSessionExpired` not called; no fake timers, no `as`
- [ ] T021 Implement transport `src/api/http-client.ts` per research R5 and contracts/http-client.md: `createHttpClient({ baseUrl, onSessionExpired })` returns `{ request<T>(opts: { method: 'GET'|'POST'|'PUT'; path: string; body?: unknown; schema?: ZodType<T>; auth: 'session'|'none'; captcha?: boolean }): Promise<T> }`; closure state `csrfPromise` and `rotatePromise` (single-flight, `rotatePromise` cleared in `finally`, `csrfPromise` reset on failure/419); every request sends `X-Requested-With: XMLHttpRequest`, JSON `Content-Type` when body, `X-CSRF-TOKEN` on POST/PUT (awaits `ensureCsrf()` before the first non-csrf request), `X-Captcha-Token: 'dev-captcha'` when `captcha`; on 419 once → reset CSRF + retry; on 401 with `auth: 'session'` once → `await rotateOnce()` → retry; rotate is sent with `auth: 'none'` body `{ fingerprint: getFingerprint() }`; rotate failure or second 401 → `onSessionExpired()` + throw `ApiError(AuthenticationException)`; `fetch` rejection → `NetworkError`; non-2xx → `toApiError`; 204/empty → `undefined`; parse success body with `schema` → mismatch throws `SchemaMismatch` (+ `console.error` when `import.meta.env.DEV`); short comment documenting single-flight and "rotate never rotates" guarantees; keep file ≤ ~150 lines
- [ ] T022 Implement typed endpoints `src/api/endpoints.ts` as `createEndpoints(client)` (or functions taking the client) per contracts/http-client.md: `login(input)` (captcha, `auth: 'none'`, adds `fingerprint`), `issueSession({ device_session_token })`, `revokeSession()`, `getMe()`, `listWebhooks({ page, search })` (query `page`, `limit=10`, `search` omitted when empty), `getWebhook(id)`, `updateWebhook(id, input)`; all session endpoints use `auth: 'session'`, all auth endpoints `auth: 'none'`; verify T020 passes (`pnpm test`)

**Checkpoint**: `pnpm test` is green with the required 2×401 → 1 rotate test. The mock serves the
full contract.

---

## Phase 3: User Story 1 — Sign in and reach the webhook list (Priority: P1) 🎯 MVP

**Goal**: valid credentials lead to the webhooks route with the user's name shown. A wrong
password shows a field error. No tokens are stored anywhere.

**Independent Test**: `pnpm dev` → sign in with `admin@smartsender.test` / `password123` →
`/webhooks` placeholder and name in the header. A wrong password shows a message under the
password field. `localStorage` contains only `fingerprint`.

- [ ] T023 [P] [US1] Create `src/app/query-client.ts`: `new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false }, mutations: { retry: false } } })` (research R11)
- [ ] T024 [P] [US1] Create `src/features/auth/me-query.ts`: `meQueryKey = ['me'] as const`, `meQueryOptions(api)` using `getMe`, `staleTime: Infinity`
- [ ] T025 [US1] Create `src/app/http.ts`: the single `createHttpClient({ baseUrl: window.location.origin, onSessionExpired })` instance and `api = createEndpoints(client)`; `onSessionExpired` is a late-bound callback set by the router module (`setSessionExpiredHandler(fn)`) to avoid an import cycle; the handler itself is implemented in T031
- [ ] T026 [US1] Implement `src/features/auth/use-login.ts`: `useMutation` whose `mutationFn` runs `login({ email, password })` → `issueSession({ device_session_token })` with the token kept as a **local variable only** → `queryClient.fetchQuery(meQueryOptions(api))`; returns the mutation; no token in state/URL/storage (FR-003)
- [ ] T027 [US1] Implement `src/features/auth/login-page.tsx`: react-hook-form + `zodResolver(loginInputSchema)`, fields `email` / `password` with `<Label htmlFor>`, `aria-invalid`, `aria-describedby` error ids; submit disabled while `isPending`; on `ApiError` `ValidationException` map `fields[name][0]` to `setError` for `email`/`password`, other fields or messages to `setError('root.server')`; other `ApiError` types → root error "Не вдалося увійти. Спробуйте ще раз." (exhaustive switch); on success navigate to `search.redirect` if it starts with `/` and not `//`, else `/webhooks`; show banner "Сесія завершилась. Увійдіть знову." when `search.reason === 'expired'`; Ukrainian labels "Email", "Пароль", button "Увійти"
- [ ] T028 [US1] Implement `src/app/router.tsx` (code-based TanStack Router, `createRootRouteWithContext<{ queryClient: QueryClient }>()`): `/` → redirect `/webhooks`; `/login` with `validateSearch` zod `{ redirect?: string, reason?: 'expired' }` (invalid → dropped) and `beforeLoad` redirecting to `/webhooks` when `queryClient.getQueryData(meQueryKey)` exists; pathless protected layout route with `beforeLoad` that throws `redirect({ to: '/login', search: { redirect: location.href } })` when `me` is not cached (research R6); `/webhooks` child with a temporary placeholder component; register router type (`declare module '@tanstack/react-router'`)
- [ ] T029 [US1] Implement `src/app/protected-layout.tsx`: header with text wordmark "Smart Sender", `me.name` from `useSuspenseQuery`/`useQuery(meQueryOptions)`, and `<Outlet/>`; logout button placeholder wired in US2
- [ ] T030 [US1] Wire `src/app/app.tsx` (`QueryClientProvider`, `RouterProvider` with `context: { queryClient }`, `<Toaster/>` from `src/shared/ui/sonner.tsx`) and `src/main.tsx` (`await startMockWorker()` before render when `import.meta.env.DEV`, also in preview build so the deployed demo works — enable unconditionally since the app has no real backend)

**Checkpoint**: US1 is fully functional, and sign-in can be shown as a demo.

---

## Phase 4: User Story 2 — Session stays alive transparently and ends cleanly (Priority: P1)

**Goal**: silent rotate while working. Rotate failure leads to login with "Сесія завершилась", and
logout clears everything.

**Independent Test**: after sign-in, wait more than 30 s and navigate, and nothing visible happens
(Network shows `401 → rotate → retry`). Running `__mock.endSession()` and then navigating leads to
`/login` with the banner. "Вийти" opens `/login`, and Back does not reveal data.

- [ ] T031 [US2] Implement the session-expired handler in `src/app/router.tsx` (registered via `setSessionExpiredHandler` from `src/app/http.ts`): `queryClient.clear()` then `router.navigate({ to: '/login', search: { reason: 'expired', redirect: router.state.location.href } })`; guard against duplicate navigation if called twice in the same tick (FR-008, research R7)
- [ ] T032 [US2] Implement `src/features/auth/use-logout.ts`: `useMutation` calling `revokeSession()`; in `onSettled` (success **or** error) → `queryClient.clear()` and `navigate({ to: '/login', replace: true })` (FR-009, spec edge case "sign-out request fails")
- [ ] T033 [US2] Add "Вийти" button to `src/app/protected-layout.tsx` using `useLogout`, disabled while pending
- [ ] T034 [US2] Verify that the guard in `src/app/router.tsx` re-runs after `queryClient.clear()` (navigating to a protected route after logout/expiry redirects to `/login`), and that reload on `/webhooks?page=2&search=hook` → `/login?redirect=...` → after sign-in returns to the same URL (FR-010, US1-5)

**Checkpoint**: US1 and US2 both work. The core evaluated session behaviour is complete.

---

## Phase 5: User Story 3 — Browse and search webhooks (Priority: P2)

**Goal**: a table with 10 items per page, pagination, and debounced search. Page and search live
in the URL and survive reload and back/forward. Loading, empty and error states are shown.

**Independent Test**: search `hook`, go to page 2, reload, and the view is the same. Back/forward
restore the previous views. A new search resets to page 1. `?page=abc` opens page 1. `zzzz` shows
the empty state. Offline mode shows the error with "Повторити".

- [ ] T035 [P] [US3] Create `src/features/webhooks/list-search.ts`: `listSearchSchema = z.object({ page: z.number().int().min(1).catch(1), search: z.string().trim().max(100).catch('') })` with defaults `{ page: 1, search: '' }`, exported type `ListSearch`, and `listSearchDefaults` for `stripSearchParams` (data-model "List search params")
- [ ] T036 [P] [US3] Create `src/shared/use-debounced-value.ts`: `useDebouncedValue<T>(value: T, delayMs: number): T` with `setTimeout`/cleanup
- [ ] T037 [P] [US3] Create `src/shared/error-state.tsx`: `<ErrorState message onRetry />` rendering an `Alert` with text and a "Повторити" button
- [ ] T038 [US3] Create `src/features/webhooks/webhook-queries.ts`: `webhookListQueryOptions(api, { page, search })` with key `['webhooks', 'list', { page, search }]` and `placeholderData: keepPreviousData`; `webhookDetailQueryOptions(api, id)` with key `['webhooks', 'detail', id]` (detail used in US4)
- [ ] T039 [US3] Register `/webhooks` in `src/app/router.tsx` with `validateSearch: listSearchSchema` and `search: { middlewares: [stripSearchParams(listSearchDefaults)] }`, replacing the placeholder with `WebhooksPage`
- [ ] T040 [US3] Implement `src/features/webhooks/webhook-search-input.tsx`: local `draft` initialised from URL `search`; `useDebouncedValue(draft, 300)`; when the debounced value differs from URL `search` → `navigate({ search: { search: debounced, page: 1 }, replace: true })`; effect re-syncs `draft` when URL `search` changes externally (back/forward) and differs from the debounced draft (research R8); labelled input "Пошук за назвою"
- [ ] T041 [US3] Implement `src/features/webhooks/webhooks-page.tsx`: reads `page`/`search` from `Route.useSearch()` (never mirrored into `useState`), `useQuery(webhookListQueryOptions)`; states: initial loading → `Skeleton` rows; error → `ErrorState` with `refetch`; empty (`data.length === 0`) → "Нічого не знайдено" (+ "На першу сторінку" link when `page > 1`); success → semantic `<table>` (shadcn `Table`) with columns "Назва" (a `<Link to="/webhooks/$webhookId" params search={{ page, search }}>`), "URL", "Активність" ("Активний"/"Неактивний" badge using success/muted tokens); pagination from `paging.pages` with prev/next + page numbers via `<Link search={(prev) => ({ ...prev, page })}>` (push); show subtle fetching indicator while `isPlaceholderData`; keep file ≤ ~150 lines (extract `webhooks-table.tsx` if needed)

**Checkpoint**: US1–US3 work. URL state behaves correctly on reload and back/forward.

---

## Phase 6: User Story 4 — Edit a webhook (Priority: P3)

**Goal**: an edit screen for name and URL with client and server field errors, a not-found state, a
success toast, and a return to the same list view.

**Independent Test**: open a webhook, then clear the name (error) and enter `ftp://x` (error). A
valid save shows the "Збережено" toast and returns to the same list page with the updated row.
`/webhooks/9999` shows "Вебхук не знайдено".

- [ ] T042 [US4] Add `useUpdateWebhook(id)` to `src/features/webhooks/webhook-queries.ts`: `useMutation(updateWebhook)`; `onSuccess` → `queryClient.setQueryData(['webhooks','detail',id], updated)` and `invalidateQueries({ queryKey: ['webhooks','list'] })`
- [ ] T043 [US4] Register `/webhooks/$webhookId` in `src/app/router.tsx` under the protected layout: `params.parse` to a positive int (invalid → render not-found), `validateSearch: listSearchSchema` (same list params, research R9)
- [ ] T044 [US4] Implement `src/features/webhooks/webhook-edit-form.tsx`: react-hook-form + `zodResolver(webhookInputSchema)` with `defaultValues` from the webhook; fields "Назва" / "URL" with `<Label htmlFor>`, `aria-invalid`, `aria-describedby`; submit "Зберегти" disabled while `isPending`; "Скасувати" link back to `/webhooks` with list params; on `ValidationException` map `fields.name`/`fields.url` `[0]` → `setError`, unknown fields/message → `setError('root.server')`; other `ApiError` types → root error (exhaustive switch); on success → `toast.success('Збережено')` and `navigate({ to: '/webhooks', search: { page, search } })`
- [ ] T045 [US4] Implement `src/features/webhooks/webhook-edit-page.tsx`: `useQuery(webhookDetailQueryOptions)`; loading → skeleton; `ApiError` `NotFoundException` (or invalid id) → "Вебхук не знайдено" + link "До списку вебхуків" (with list params); other errors → `ErrorState` with `refetch`; success → card with read-only "Активність" + `WebhookEditForm`; "← До списку" link preserving `page`/`search`

**Checkpoint**: all user stories work independently.

---

## Phase 7: Polish & Cross-Cutting — Issue "Extra transport tests, README, final gate"

**Purpose**: optional transport guarantees, documentation and the final quality gate.

- [ ] T046 [P] Add optional transport tests to `src/api/http-client.test.ts`: (G6) `endSession()` then a protected call → rotate 400 → `onSessionExpired` called once and promise rejects with `AuthenticationException`; (G5/G6) handler override making `/v1/me` always 401 → exactly one rotate, no second rotate, `onSessionExpired` once; (G7) override returning 419 once for `PUT /v1/webhooks/1` → exactly two `GET /csrf` calls total and update succeeds; (G2) two parallel first calls → one `GET /csrf`
- [ ] T047 [P] Write `README.md` (Ukrainian or English, consistent): how to run (pnpm 12 via `npm i -g pnpm` or `corepack enable`; `pnpm install`, `pnpm dev`) and test (`pnpm test`); test credentials `admin@smartsender.test` / `password123`; key decisions with references to `.specify/memory/constitution.md` (transport single-flight, URL as state owner, `me` cache as auth signal, mock session in memory instead of cookies, TS 6 pin); manual validation checklist from `specs/001-webhooks-admin-app/quickstart.md`; "Not done / trade-offs" (no UI/e2e tests, server 422 on edit not reproducible from UI because client mirrors server rules, no network retry, re-login after reload); "How it would scale" (OpenAPI codegen, i18n, e2e with Playwright, monorepo when needed); actual time spent; honest note that development was spec-driven with Claude Code + Spec Kit
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
- **Polish (Phase 7)**: T046 can start right after Phase 2. T047–T049 come after all stories.

### Story completion order

```text
Setup → Foundational → US1 → ┬→ US2
                             └→ US3 → US4 → Polish
```

### Within phases

- T013, T014 and T015 run in parallel. T016 → T017 → (T018 ∥ T019). T020 → T021 → T022.
- US1: T023 ∥ T024, then T025 → T026 → T027 → T028 → T029 → T030.
- US3: T035 ∥ T036 ∥ T037, then T038 → T039 → T040 → T041.
- US4: T042 → T043 → T044 → T045.

### Parallel Opportunities

- Setup: T005, T006, T007 and T009 touch separate config files.
- Foundational: the schemas, ApiError and fingerprint (T013–T015). The browser and server mock entry points (T018, T019).
- After US1: US2 and US3 can proceed in parallel (both touch `src/app/router.tsx`, so merge carefully).
- Polish: T046 (tests) ∥ T047 (README).

---

## Parallel Example: Foundational

```bash
Task: "Define zod schemas in src/api/schemas.ts"
Task: "Implement ApiError in src/api/api-error.ts"
Task: "Implement getFingerprint in src/api/fingerprint.ts"
```

## Parallel Example: User Story 3

```bash
Task: "Create list search schema in src/features/webhooks/list-search.ts"
Task: "Create useDebouncedValue in src/shared/use-debounced-value.ts"
Task: "Create ErrorState in src/shared/error-state.tsx"
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
| #1 | Setup | T001–T012 | `feat/1-setup` |
| #2 | Foundational | T013–T022 | `feat/2-transport-mock` |
| #3 | US1 + US2 (P1) | T023–T034 | `feat/3-auth-session` |
| #4 | US3 (P2) | T035–T041 | `feat/4-webhook-list` |
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
