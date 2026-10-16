# Data Model: Webhooks Admin App

All schemas are written with zod in `src/api/schemas.ts`. TS types come from `z.infer` only
(Principle VII). Any external `null` is converted to `undefined` inside the schema.

## Wire entities (server → client)

### User — `GET /v1/me`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | integer | |
| `email` | string (email) | |
| `first_name` | string | |
| `last_name` | string | |
| `name` | string | display name, shown in the header |

### Webhook

| Field | Type | Rules |
| --- | --- | --- |
| `id` | integer | stable, used in route `/webhooks/$webhookId` |
| `name` | string | required (non-empty after trim) |
| `url` | string | valid `http:` / `https:` URL |
| `active` | boolean | read-only in UI |
| `created_at` | string (ISO 8601) | display-only |

### WebhookList — `GET /v1/webhooks`

```text
{ data: Webhook[],
  paging: { pages: { current: int≥1, last: int≥1 },
            results: { total: int≥0, limitation: int≥1 } } }
```

- `total` is the count after search is applied. `limitation` is the page size (10).
- `last` is `max(1, ceil(total / limitation))`, and the mock keeps it at least 1 even when empty.

### Error envelope

```text
{ error: { type: ErrorType, message: string, payload?: Record<string, string[]> } }
```

`ErrorType` ∈ `BadRequestException | AuthenticationException | NotFoundException |
TokenMismatchException | ValidationException`. `payload` is present only for `ValidationException`.

## Client-side types

### ApiError (in `src/api/api-error.ts`)

`class ApiError extends Error { readonly info: ApiErrorInfo }`, where `ApiErrorInfo` is a
discriminated union by `type`:

| `type` | Extra fields | Origin |
| --- | --- | --- |
| `BadRequestException` | `message` | 400 |
| `AuthenticationException` | `message` | 401 after rotate/retry failed |
| `NotFoundException` | `message` | 404 |
| `TokenMismatchException` | `message` | 419 after one CSRF retry |
| `ValidationException` | `message`, `fields: Record<string, string[]>` | 422 |
| `NetworkError` | `message` | `fetch` rejected |
| `SchemaMismatch` | `message`, `issues` | zod parse failed on a response |
| `UnknownError` | `status`, `message` | any other status / unparsable error body |

Every consumer handles all variants exhaustively, using `satisfies never` in the `default` case.

### Form inputs

| Form | Fields | Client rules (mirror server) |
| --- | --- | --- |
| `LoginForm` | `email`, `password` | email format; password non-empty |
| `WebhookEditForm` | `name`, `url` | name trimmed non-empty; url `http(s)://` valid URL |

### List search params (route search, the URL is the source of truth)

| Param | Type | Default / fallback | Write mode |
| --- | --- | --- | --- |
| `page` | int ≥ 1 | `1` (invalid → `1`) | push |
| `search` | string, trimmed, ≤ 100 | `''` (invalid → `''`) | replace, debounced 300 ms, resets `page` to 1 |

Defaults are stripped from the URL. The same schema is used by `/webhooks/$webhookId` so the edit
screen can return to the same list view.

### Login search params

| Param | Type | Purpose |
| --- | --- | --- |
| `redirect` | string; used only if `new URL(redirect, location.origin)` has the app's origin (research R7) | where to go after sign-in (`pathname + search` of that URL) |
| `reason` | `'expired'` (optional) | show "Session expired" |

### Device identifier

- `localStorage['fingerprint']`, matching `/^[0-9a-f]{32}$/`.
- Generated once from `crypto.getRandomValues(new Uint8Array(16))` → hex. If the stored value is
  invalid, a new one is generated.
- This is the only key the app writes to browser storage.

## Mock state (in-memory, `src/mocks/db.ts`)

| Item | Shape | Notes |
| --- | --- | --- |
| `user` | User + `password` | fixed credentials (documented in README) |
| `webhooks` | `Webhook[]` (28 items) | deterministic seed, stable order by `id` |
| `deviceTokens` | `Map<token, fingerprint>` | issued by login, consumed once by issue |
| `session` | `{ fingerprint, expiresAt } \| undefined` | the session itself; never sent to client |
| `CSRF_TOKEN` | constant string | returned by `GET /csrf` |
| `sessionTtlMs` | number (30 000) | |

Helpers: `resetDb()` and `expireSession()` for tests (an expired session can still be renewed by
rotate). `endSession()` clears the session so that rotate returns `400`; it is exposed in dev as
`window.__mock.endSession()` for the manual check. `failNextUpdate()` sets a one-shot flag: the
next valid `PUT /v1/webhooks/:id` returns `422` with `payload.url: ['The url must be a valid URL.']`
(contract-compliant response; `resetDb()` clears the flag). It is exposed in dev as
`window.__mock.failNextUpdate()` so the edit form's server-error mapping can be checked by hand.

## Session state transitions (mock)

```text
             login (valid creds + captcha)        issue (token+fp match)
 [no session] ───────────────────────► [token issued] ───────────────────► [active, exp=now+30s]
      ▲                                                                      │   ▲
      │ revoke                                                 rotate (fp ok)│   │ exp=now+30s
      │◄─────────────────────────────────────────────────────────────────────┤───┘
      │                                                                      │ now ≥ exp
      │                                                                      ▼
      │                                           [expired]: protected → 401, rotate → 200 (extends)
      └──────────────────────────── revoke ◄──────────┘
```

- An expired session can still be renewed by rotate (that is the point of rotate). Rotate returns
  `400` only when there is no session (before issue / after revoke) or when the fingerprint does
  not match.
- A protected request is authorized when `session && now < session.expiresAt`.

## Client cache (TanStack Query keys)

| Key | Data | Invalidation |
| --- | --- | --- |
| `['me']` | User | set on login; whole cache cleared on logout/expiry |
| `['webhooks','list',{page,search}]` | WebhookList | invalidated after a successful PUT |
| `['webhooks','detail',id]` | Webhook | set from the PUT response |
