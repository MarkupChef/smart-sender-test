# Contract: UI routes (TanStack Router, code-based)

| Path | Guard | Search params (zod `validateSearch`) | Screen states |
| --- | --- | --- | --- |
| `/` | — | — | redirect → `/webhooks` |
| `/login` | if `me` is cached → redirect to `redirect` or `/webhooks` | `redirect?`: internal path; `reason?`: `'expired'` | form; field errors; root error; "Session expired" banner |
| `/webhooks` | requires `me` in cache, else → `/login?redirect=<current href>` | `page` (int ≥ 1, default 1), `search` (string, default `''`); defaults stripped | loading (skeleton), empty ("Nothing found"), error + "Retry", success (table + pagination) |
| `/webhooks/$webhookId` | same as above; `$webhookId` parsed as positive int, else not-found | same list params (to return to the same view) | loading, not-found ("Webhook not found" + link), error + "Retry", form |

## Layout

- The protected layout has a header with a text wordmark "Smart Sender", `me.name` (from the route
  context returned by the guard), and a "Sign out" button.
- There are no global error toasts. A sonner toast "Saved" is shown only after a successful save.

## Navigation semantics

| Action | Navigation |
| --- | --- |
| Change page | `navigate({ search: prev => ({ ...prev, page }) })` (push) |
| Type in search | after 300 ms: `navigate({ search: { search, page: 1 }, replace: true })` |
| Open webhook | `<Link to="/webhooks/$webhookId" params search={{ page, search }}>` |
| Back / after save | `navigate({ to: '/webhooks', search: { page, search } })` |
| Sign-in success | `navigate({ href: target.pathname + target.search, replace: true })` (`target = new URL(redirect, origin)`, same origin only) or `navigate({ to: '/webhooks', replace: true })` |
| Session expired | remove `me` → `navigate({ to: '/login', search: { reason: 'expired', redirect } })` → cache cleared (idempotent) |
| Logout | revoke (errors ignored) → remove `me` → `navigate({ to: '/login', replace: true })` → cache cleared |
