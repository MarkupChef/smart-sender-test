# Contract: HTTP API (implemented by the MSW mock, consumed by `src/api`)

Source of truth: `docs/smart-sender-senior-frontend-test.md`. This file restates that contract and
pins down the behaviour the brief leaves implicit. Schemas: [data-model.md](../data-model.md).

## Common rules

- Every request MUST carry `X-Requested-With: XMLHttpRequest`. The mock answers a request without
  it with `400 BadRequestException`.
- `POST`/`PUT` MUST carry `X-CSRF-TOKEN` equal to the token from `GET /csrf`. The check runs
  **before** any other validation. If the header is missing or wrong, the response is `419`.
- Errors use the envelope `{ error: { type, message, payload? } }`.
- The session lives on the server only, and no session token ever appears in a response body or
  header.

## Endpoints

| Method & path | Request | Success | Errors | Auth |
| --- | --- | --- | --- | --- |
| `GET /csrf` | — | `204`, header `X-CSRF-TOKEN` | — | none |
| `POST /auth/login` | header `X-Captcha-Token` (non-empty); `{ email, password, fingerprint }` | `200 { device_session_token }` | `422` (`payload.password` on wrong credentials; `payload.<field>` on missing fields; `payload.captcha` when the header is missing), `419` | none |
| `POST /auth/token/issue` | `{ device_session_token, fingerprint }` | `200`, starts session (TTL 30 s) | `422` (unknown/used token or fingerprint mismatch), `419` | none |
| `POST /auth/token/rotate` | `{ fingerprint }` | `200`, `expiresAt = now + 30 s` | `400` (no session, or fingerprint mismatch), `419` | none (never retried by rotate) |
| `POST /auth/token/revoke` | `{ fingerprint }` | `204`, session cleared (idempotent) | `419` | none |
| `GET /v1/me` | — | `200 User` | `401` | session |
| `GET /v1/webhooks?page=&limit=&search=` | `page` ≥ 1 (default 1), `limit` (default 10), `search` (case-insensitive substring of `name`) | `200 WebhookList` | `401` | session |
| `GET /v1/webhooks/{id}` | — | `200 Webhook` | `401`, `404` | session |
| `PUT /v1/webhooks/{id}` | `{ name, url }` | `200 Webhook` (updated) | `401`, `404`, `422` (`payload.name`, `payload.url`), `419` | session |

Order of checks for protected `PUT`: CSRF → session → existence → validation.

## Validation messages (mock)

| Field | Rule | Message |
| --- | --- | --- |
| `email` | required | `The email field is required.` |
| `password` | required | `The password field is required.` |
| `password` | wrong credentials | `These credentials do not match our records.` |
| `name` | required (after trim) | `The name field is required.` |
| `url` | `http:`/`https:` URL | `The url must be a valid URL.` |

## Pagination

- Records are filtered first, then sliced: `data = filtered.slice((page-1)*limit, page*limit)`.
- If `page` is beyond `last`, the response has `data: []`, and `current` echoes the requested page.

## Request flow from the client's point of view

```text
login screen submit
  GET /csrf (once, shared) ─► POST /auth/login ─► POST /auth/token/issue ─► GET /v1/me ─► /webhooks

any protected call ─► 401 ─► POST /auth/token/rotate (shared by all concurrent 401s)
                               ├─ 200 ─► retry original once ─┬─ 2xx ─► result
                               │                              └─ 401 ─► onSessionExpired
                               └─ 400 ─► onSessionExpired

any POST/PUT ─► 419 ─► GET /csrf (shared) ─► retry once ─► result or ApiError(TokenMismatchException)
```
