# Research: Webhooks Admin App

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-16

The constitution fixes the stack, so Phase 0 resolves versions and the few design questions the
constitution leaves open. No `NEEDS CLARIFICATION` items remain.

## R1. Toolchain versions

- **Decision**: Node `22.18` (`.nvmrc`, `engines: ">=22.12"`), pnpm `12.14.0`, installed globally
  and pinned via `"packageManager": "pnpm@12.14.0"` in `package.json`. `pnpm/action-setup` in CI
  and Corepack for other developers read this field, so everyone gets the same version.
  TypeScript **`~6.0.3`**, Vite 8, React 19, TanStack Query 5, TanStack Router 1 (code-based),
  react-hook-form 7 + `@hookform/resolvers` 5, zod 4, MSW **3**, Vitest 5, Tailwind CSS 4,
  ESLint 10 + typescript-eslint 8, husky 9 + lint-staged.
- **Rationale**: `typescript@latest` is 7.0 (native port), but `typescript-eslint@8` peer range is
  `>=4.8.4 <6.1.0`. Since `strictTypeChecked` is required by the constitution, TS is pinned to 6.0.
  MSW 3 requires Node ≥ 22.12, and the local Node is 22.18.
- **Alternatives**: TS 7 (it breaks typed linting, rejected). MSW 2 (works, but it is the previous
  major and has no advantage here).

## R2. MSW 3 specifics

- **Decision**: `http`/`HttpResponse` come from `msw/http`, `delay` from `msw/utils/delay`,
  `setupWorker` from `msw/browser`, `setupServer` from `msw/node`. Unhandled requests are configured
  with `onUnhandledFrame` (renamed from `onUnhandledRequest`). It is set to `'error'` in tests and
  `'bypass'` in the browser.
- **Rationale**: these are the v3 entrypoint changes from the official 2.x→3.x migration guide.
- **Alternatives**: none.

## R3. Where the mock keeps the session

- **Decision**: one in-memory `session` record in the mock db (`{ fingerprint, expiresAt }`).
  No cookies are used.
- **Rationale**: the brief says the mock stores the session "like an HttpOnly cookie", meaning the
  client never sees it. MSW in the browser can only set cookies through `document.cookie`, and
  those are readable from JS, so a real cookie would *violate* the requirement. With a single user
  and memory-only state, one session record is the simplest correct model. Mock state lives in the
  page's JS context, so a reload naturally ends the session. The brief allows that.
- **Alternatives**: a `Set-Cookie` mock (JS-readable, rejected); a session map per fingerprint
  (YAGNI).

## R4. Base URL in browser vs Node tests

- **Decision**: `createHttpClient({ baseUrl, onSessionExpired })`. The browser passes
  `window.location.origin` and tests pass `http://localhost`. Handlers are built by
  `createHandlers(baseUrl)` from the same base, so paths stay exact (`${baseUrl}/v1/me`). In the
  browser the same `API_BASE_URL` value goes to both `createHttpClient` and
  `startMockWorker(baseUrl)`, so a non-root base cannot bypass the mock.
- **Rationale**: Node `fetch` rejects relative URLs. One factory parameter avoids wildcard
  patterns and globals. The factory has exactly two callers (app and test), so it is not a
  speculative abstraction. It also gives each test a fresh client with fresh CSRF/rotate state.
- **Alternatives**: a module singleton with `configure()` (hidden shared state across tests,
  rejected); `*/path` wildcards (would also match foreign hosts).

## R5. Transport algorithm (single-flight CSRF and rotate, one retry each)

- **Decision**: linear code in `src/api/http-client.ts`:
  1. `ensureCsrf()`. A `csrfPromise` held in the `createHttpClient` closure makes concurrent first calls share one
     `GET /csrf`. The promise is reset on failure and on `419`.
  2. `send()` adds `X-Requested-With`, `Content-Type`, and `X-CSRF-TOKEN` on POST/PUT, plus
     `X-Captcha-Token` when the endpoint asks for it.
  3. On `419` (once per request): reset CSRF, `ensureCsrf()`, resend.
  4. On `401` from a request whose `auth` flag is `'session'` (once per request):
     `await rotateOnce()`, then resend. `rotateOnce()` shares the closure-held `rotatePromise`,
     which is cleared in `finally`. A request that was sent before the latest rotate settled
     (a `settledRotations` counter read before each send) reuses its outcome: retried after a
     success, rejected after a failure, never rotating again.
  5. The rotate call itself is sent with `auth: 'none'`, so its own failure can never start a
     rotate. If the server rejects rotate (4xx), every waiter throws
     `ApiError{ type: 'AuthenticationException' }`; a transient failure (`NetworkError`, 5xx) is
     rethrown as is and does not end the session. If the retried request returns `401` after a
     successful rotate, it throws the same error. `onSessionExpired()` fires at most once per
     settled rotate, however many requests are rejected by it.
     Before a retry the unread response body is cancelled to free the connection.
  6. The response body is parsed with the endpoint's zod schema. A mismatch throws
     `ApiError{ type: 'SchemaMismatch' }` and logs `console.error` in dev.
- **Rationale**: this satisfies FR-006…FR-013 and Principle III with no middleware chain. The
  per-request retry flags are plain booleans in the function scope.
- **Alternatives**: interceptor chains or ky/axios hooks (an extra dependency and harder to read,
  rejected).

## R6. Client-side "am I signed in?"

- **Decision**: the presence of `me` in the TanStack Query cache is the only client auth signal.
  The protected layout's `beforeLoad` checks `queryClient.getQueryData(meQueryOptions(api).queryKey)`. If it is
  missing, it throws `redirect({ to: '/login', search: { redirect: location.href } })`. `/login`
  redirects away when `me` is cached.
- **Rationale**: a session cannot survive reload (R3), so probing the server on a cold start would
  only produce `401 → rotate 400 → "session ended"`. That would be a misleading message on a fresh
  visit. Using the cache as the signal keeps one source of truth (Principle IV) and needs no extra
  store.
- **Alternatives**: a global auth store (forbidden without justification); a `me` probe on start
  (wrong UX, see above).

## R7. Session-expired and logout flow

- **Decision**: one teardown `endSession(reason: 'expired' | 'signed-out')` in `src/app/session.ts`,
  passed to features through the router context, runs in order: `cancelQueries()` (aborts requests
  in flight, `queryFn` forwards its `signal`) → `removeQueries({ queryKey: meQueryOptions(api).queryKey })` →
  `await router.navigate({ to: '/login', replace: true })` (with `search: { reason: 'expired',
  redirect }` for expiry) → `queryClient.clear()` in `finally`; if navigation throws, the error is
  logged and `window.location.replace('/login')` is the fallback. A module-level `sessionEnding`
  promise makes it single-flight: concurrent expiry and logout share the first teardown, and it is
  reset when settled, so the next expiry after a new login is handled again. `onSessionExpired`
  (passed to `createHttpClient` at creation) ignores the call when `me` is not cached. The login
  screen shows "Session expired" when `reason === 'expired'`. Logout (`signOut()` in the router context) aborts queries, calls
  `revoke`, ignores its error, then runs `endSession('signed-out')`; while it runs,
  `onSessionExpired` is ignored so a 401 during revoke cannot turn it into an expiry. The protected layout reads `me` from the route context
  returned by the guard's `beforeLoad`, not from `useQuery`.
- **Rationale**: the URL is the single place for navigation state. `reason` is not a secret.
  Logout must leave the user signed out even when `revoke` fails (spec edge case). Removing only
  `me` first lets the `/login` guard pass (it redirects away while `me` is cached); clearing the
  rest only after navigation means no still-mounted query can refetch, hit `401 → rotate 400` and
  show a false "Session expired" after a voluntary logout.
- **Open-redirect guard**: `redirect` is accepted only if `new URL(redirect, location.origin)` has
  the app's own origin; the app then navigates to that URL's `pathname + search`. A prefix check
  (`/` but not `//`) is not enough: browsers read `/\evil.com` as `//evil.com`.
  Otherwise it falls back to `/webhooks`. It is applied with
  `navigate({ href: target.pathname + target.search })`, because `redirect` carries the query
  string and `to` does not parse one.

## R8. URL state for the list

- **Decision**: the route `/webhooks` uses `validateSearch` with a zod schema:
  `page: z.number().int().min(1).default(1).catch(1)` and `search` as string-or-number → `String` →
  `trim().max(100)`, `.default('').catch('')`; `.default()` keeps both keys optional for navigation (the router's default JSON parser turns `?search=123` into a number).
  Defaults are removed from the URL with the router's `stripSearchParams` middleware. Pagination
  uses `navigate({ search })` (push). Search uses `navigate({ search: { search, page: 1 }, replace: true })`
  after a 300 ms debounce. The query key is `['webhooks', 'list', { page, search }]` with
  `placeholderData: keepPreviousData`.
- **Search input draft**: the input owns a local `draft` string, which is the text being typed and
  not navigation state. An inline `useEffect` + `setTimeout(300)` in the search input pushes it to
  the URL (one usage, so no shared hook per Principle I, and not worth a dependency). An effect re-syncs `draft` from the URL when the URL value changes externally
  (back/forward) and differs from the draft. This keeps the URL as the source of truth without
  remounting the input and losing focus.
- **Alternatives**: `key={search}` remount (loses focus on every debounced write, rejected);
  debounce libraries (not worth a dependency).

## R9. Edit screen and returning to the list

- **Decision**: the edit screen is the route `/webhooks/$webhookId`. It validates the *same* list
  search schema, so links from the list carry `page`/`search` along. "Back to list" and
  post-save navigation go to `/webhooks` with those params. After saving, the detail cache is set
  from the `PUT` response, the row is patched in every cached `['webhooks','list']` page and
  the list is then invalidated, and a sonner toast "Saved" is shown from the hook-level
  `onSuccess` (it still fires if the form unmounts mid-request).
- **Rationale**: this matches spec US4-6, survives reload, and needs no history tricks.
- **Alternatives**: a modal (no URL, no natural 404 state, rejected in spec Assumptions);
  `history.back()` (breaks when the edit page was opened directly).

## R10. Forms and server errors

- **Decision**: react-hook-form + `zodResolver`. Client schemas use the same rules as the mock:
  `name` trimmed and non-empty, `url` an http/https URL. When the mutation returns
  `ValidationException`, each `payload[field][0]` goes to `setError(field)` if `field` is a form
  field. Anything else goes to `setError('root.server', message)`. Fields render
  `aria-invalid` + `aria-describedby`. Submit is disabled while `isPending`.
- **Rationale**: Principle VIII.

## R11. TanStack Query defaults

- **Decision**: `retry: false` and `refetchOnWindowFocus: false` globally. Every error state has a
  "Retry" button that calls `refetch()`.
- **Rationale**: the transport already owns 401/419. Silent retries of 400/404/422 are wrong, and
  network retry would be speculative polish. A visible retry button is enough at this scale.
- **Alternatives**: a `retry` predicate allowing network-error retries (deferred, noted in README).

## R12. Testing approach

- **Decision**: Vitest in the `node` environment with `setupServer(...createHandlers(BASE))`.
  The mock exposes `resetDb()` and `expireSession()`. Rotate calls are counted with
  `server.events.on('request:start')`, filtered by pathname. The required test signs in through
  the real endpoints, calls `expireSession()`, fires `Promise.all([getMe(), listWebhooks()])`, and
  asserts 1 rotate plus 2 successful results. Optional tests (if time allows): rotate failure →
  `onSessionExpired` called once; repeated 401 → no second rotate; 419 → one CSRF re-fetch.
- **Rationale**: Principle V. The tests use no fake timers and no React.

## R13. UI kit and brand

- **Decision**: shadcn/ui (button, input, label, table, card, skeleton, alert, sonner,
  pagination). The theme lives in `src/shared/theme.css` and maps the brand tokens from the
  constitution onto the shadcn CSS variables. Fonts come from `@fontsource/montserrat` and
  `@fontsource/open-sans`. The wordmark is text only.
- **Rationale**: the constitution's Technology & UI Constraints.
