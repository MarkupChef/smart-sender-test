# Quickstart & Validation: Webhooks Admin App

## Prerequisites

- Node 22.12+ (`nvm use` reads `.nvmrc`)
- pnpm 12 (`npm i -g pnpm`, or `corepack enable`, which picks up the version from `packageManager`)

## Run

```bash
pnpm install
pnpm dev          # http://localhost:5173, MSW worker starts automatically (also in `pnpm preview`)
```

Test credentials (single mock user; the final values also go in the README):
`admin@smartsender.test` / `password123`.

## Quality gate

```bash
pnpm typecheck    # tsc --noEmit (strict)
pnpm lint         # eslint, zero warnings
pnpm test         # vitest run (node env, MSW setupServer)
```

All three must exit 0. They also run in the pre-commit hook and in CI.

## Automated validation

| Scenario | Command | Expected |
| --- | --- | --- |
| Two parallel `401` → one rotate → both retried (required, G4) | `pnpm test` | 1 call to `/auth/token/rotate`, both promises resolve with valid data |

The guarantees are listed in [contracts/http-client.md](./contracts/http-client.md).

## Manual validation checklist (copied into README)

1. **Sign-in (US1)**: a wrong password shows a message under the password field. Correct
   credentials open `/webhooks` and the header shows the user's name.
2. **Storage (FR-003/004, SC-006)**: in DevTools → Application, `localStorage` holds only
   `fingerprint` (32 hex). No token appears in the URL or in storage. `device_session_token` is
   seen only in the `/auth/login` response and the `/auth/token/issue` request; no session token
   appears in any response.
3. **Silent rotate (US2, SC-002)**: wait more than 30 s, then change the page. The Network tab
   shows `401 → rotate 200 → retry 200`, and the UI does not change. Two parallel `401`s share one
   rotate.
4. **Expiry (US2-3)**: in the console, run `__mock.endSession()`. This is a dev-only helper
   exposed by `src/mocks/browser.ts`; it clears the server session, so rotate returns `400`. The
   next request redirects to `/login` with "Session expired".
5. **Logout (US2-5)**: "Sign out" opens `/login`. Back navigation does not show cached data.
6. **URL state (US3, SC-004)**: search `hook`, go to page 2, and reload. The view is the same.
   Back/forward walk through pages. Changing the search resets to page 1. `?page=abc` opens page 1.
7. **States (US3-5/6)**: searching `zzzz` shows the empty state. Turning on DevTools → Network →
   "Offline" and changing the page shows the error state. "Retry" recovers once the network is
   back on.
8. **Edit (US4)**: clearing the name or entering `ftp://x` shows a field error. A valid save shows
   the "Saved" toast and returns to the same list page with the updated row. `/webhooks/9999`
   shows "Webhook not found". Client rules mirror the server, so to see a server `422` on the edit
   form run `__mock.failNextUpdate()` in the console and save valid values: the server message
   appears under the URL field (SC-005).
9. **Reload on a protected page**: re-sign-in is requested, and the list params from the URL are
   applied afterwards.
