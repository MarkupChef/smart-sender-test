# Smart Sender Webhooks Admin

Admin app for Smart Sender webhooks: sign in, browse and search the webhook list with pagination,
edit a webhook. The backend is fully mocked with [MSW](https://mswjs.io/), in the browser and in
tests. Task brief: [`docs/smart-sender-senior-frontend-test.md`](docs/smart-sender-senior-frontend-test.md).

Stack: React 19, TypeScript 6 (strict), Vite 8, TanStack Router + Query, react-hook-form + zod,
Tailwind CSS 4 + shadcn/ui, MSW 3, Vitest 5.

## Run

Prerequisites: Node 22.12+ (`nvm use` reads `.nvmrc`) and pnpm 12 (`npm i -g pnpm`, or
`corepack enable`, which picks up the version from `packageManager`).

```bash
pnpm install
pnpm dev          # http://localhost:5173, the MSW worker starts automatically
```

Test credentials: **`admin@smartsender.test` / `password123`**.

## Test and quality gate

```bash
pnpm test         # vitest run (node env, MSW setupServer)
pnpm typecheck    # tsc --noEmit, app + node configs
pnpm lint         # eslint, zero warnings
pnpm build        # tsc -b && vite build
```

The same checks run in the pre-commit hook (husky + lint-staged) and in CI (`typecheck`, `lint`,
`test` are required checks on `main`).

Tests cover the transport layer only (`src/api/http-client.test.ts`): the required case of two
parallel `401`s sharing one rotate, plus failed rotate, repeated `401`, aborted requests, network
errors during rotate, single-flight CSRF fetch and `419` recovery. The guarantees are listed in
[`contracts/http-client.md`](specs/001-webhooks-admin-app/contracts/http-client.md).

## Key decisions

The rules live in [`.specify/memory/constitution.md`](.specify/memory/constitution.md); the
rationale for each technical choice is in
[`research.md`](specs/001-webhooks-admin-app/research.md).

- **Transport owns the session** (Principle III). `src/api/http-client.ts` is framework-agnostic
  and the only place that calls `fetch`. It adds `X-Requested-With`, fetches the CSRF token lazily
  and single-flight before the first `POST`/`PUT`, re-fetches it once on `419`, and on `401`
  awaits one shared rotate promise and retries once. It never rotates from rotate; a failed
  rotate or a repeated `401` calls `onSessionExpired` exactly once. Components and hooks never see
  `401`/`419`, and TanStack Query `retry` is off.
- **Types as contract** (Principle VII). Every response is validated with zod, types come from
  `z.infer`, errors are normalized into an `ApiError` discriminated union and handled
  exhaustively. API `null` becomes `undefined` at the zod boundary. No `any`, `as`, `!` or
  `@ts-ignore`.
- **URL is the state owner for the list** (Principle IV). `page` and `search` live only in the
  URL (`validateSearch` with zod); search is debounced and written with `replace`, pagination with
  `push`, so reload and back/forward restore the view. Server state is in TanStack Query, forms
  in react-hook-form. There is no global store.
- **The `me` query cache is the auth signal.** The `_protected` route guards on cached `me` data
  and redirects to `/login?redirect=...`. Logout and expiry go through one single-flight
  `endSession()` teardown: abort queries, remove `me`, navigate to `/login`, clear the whole cache.
- **Mock session in memory, not in cookies.** The brief describes the session as an HttpOnly
  cookie the client never sees. MSW in the browser can only set JS-readable cookies, which would
  break that requirement, so the mock keeps the session in its in-memory db. `localStorage` holds
  only the `fingerprint`; `device_session_token` exists only as a local variable in the login flow.
- **Every error has one owner** (Principle VIII). `401`/`419` belong to the transport, `422` maps
  to form fields via `setError` (unknown fields go to `root`), `404` shows a "not found" screen,
  anything else shows an error state with Retry. For mutations (login, edit) non-`422` errors are
  shown as a form-level `root` error, and resubmitting the form serves as Retry, so the user's
  input is not lost ([plan.md Complexity Tracking](specs/001-webhooks-admin-app/plan.md)).
- **TypeScript pinned to `~6.0.3`.** TS 7 is current, but `typescript-eslint@8` supports only
  `<6.1.0`, and typed linting (`strictTypeChecked`) is required by the constitution.
- **Module boundaries** (Principle VI): `app → features → api | shared`, enforced by ESLint
  `no-restricted-imports`. Features never import each other; UI never imports `mocks`.

## Manual validation checklist

UI is verified manually (from [`quickstart.md`](specs/001-webhooks-admin-app/quickstart.md)):

1. **Sign-in**: a wrong password shows a message under the password field. Correct credentials
   open `/webhooks` and the header shows the user's name.
2. **Storage**: in DevTools → Application, `localStorage` holds only `fingerprint` (32 hex). No
   token appears in the URL or in storage. `device_session_token` is seen only in the
   `/auth/login` response and the `/auth/token/issue` request.
3. **Silent rotate**: wait more than 30 s, then change the page. The Network tab shows
   `401 → rotate 200 → retry 200`, and the UI does not change.
4. **Expiry**: run `__mock.endSession()` in the console (dev-only helper from
   `src/mocks/browser.ts`). The next request redirects to `/login` with "Session expired".
5. **Logout**: "Sign out" opens `/login`. Back navigation does not show cached data.
6. **URL state**: search `hook`, go to page 2, reload. The view is the same. Back/forward walk
   through pages. Changing the search resets to page 1. `?page=abc` opens page 1.
7. **States**: searching `zzzz` shows the empty state. DevTools → Network → "Offline" and changing
   the page shows the error state; "Retry" recovers once the network is back.
8. **Edit**: clearing the name or entering `ftp://x` shows a field error. A valid save shows the
   "Saved" toast and returns to the same list page with the updated row. `/webhooks/9999` shows
   "Webhook not found". To see a server `422`, run `__mock.failNextUpdate()` and save valid values:
   the server message appears under the URL field.
9. **Reload on a protected page**: re-sign-in is requested, and the list params from the URL are
   applied afterwards.

## Not done / trade-offs

- **No UI or e2e tests.** Tests target the riskiest part, the transport; the UI is checked with
  the manual list above.
- **Server `422` on edit is reproducible only via `__mock.failNextUpdate()`**, because the client
  form mirrors the server validation rules.
- **No automatic network retry.** Network errors show an error state (or a form error) with a
  manual Retry.
- **Re-login after reload.** The session lives in the mock's memory and the `me` cache, so a full
  page reload asks to sign in again (the URL params survive).
- **The list error state is hard to trigger in the browser.** The MSW worker answers requests
  without the network, so Playwright offline emulation did not produce the error state during the
  final walkthrough; the state and its Retry are covered by code review only. A dev helper that
  makes the next list request fail would make it reproducible.
- Light theme only.

## How it would scale

- Generate API types and zod schemas from an OpenAPI spec instead of writing them by hand.
- Add i18n once a second language is needed; UI strings are plain English for now.
- Add e2e tests with Playwright against the same MSW handlers, plus component tests for forms.
- Move to a monorepo (shared `api` package) only when a second app needs the transport.

## Time spent

About 4 hours for the complete task, not counting later code refactoring.

## How it was built

Development was spec-driven with [Claude Code](https://claude.com/claude-code) and
[Spec Kit](https://github.com/github/spec-kit): constitution → spec → clarifications → plan →
tasks → one GitHub issue and PR per user story. All artifacts are in
[`specs/001-webhooks-admin-app/`](specs/001-webhooks-admin-app/); the constitution overrides
specs, plans and tasks. Code was reviewed and merged manually by the repository owner.
