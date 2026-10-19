# Contract: Transport module (`src/api`)

This is the public surface that features consume. It is framework-agnostic: no React and no
TanStack Query imports (Principle III).

## Factory

```ts
createHttpClient(options: {
  baseUrl: string;                 // API_BASE_URL (also passed to startMockWorker) | 'http://localhost' in tests
  onSessionExpired: () => void;    // called at most once per settled rotate (failed rotate or repeated 401s after it); the app handler should still be idempotent
}): HttpClient

type RequestOptions = {
  method: 'GET' | 'POST' | 'PUT';
  path: string;
  body?: unknown;
  auth: 'session' | 'none';
  captcha?: boolean;
  signal?: AbortSignal;            // passed to fetch; an aborted request rejects with the abort error (not ApiError) and never rotates
};

interface HttpClient {
  request<T>(opts: RequestOptions & { schema: ZodType<T> }): Promise<T>; // body validated
  request(opts: RequestOptions): Promise<undefined>;                      // body ignored
}
```

A response body is never returned without a zod schema (FR-024), so no unvalidated `T` exists.

The client state lives inside the `createHttpClient` closure and is unique per client instance:

- `csrfPromise: Promise<string> | undefined` — shared CSRF fetch (single-flight)
- `rotatePromise: Promise<void> | undefined` — shared rotate (single-flight), cleared in `finally`
- `settledRotations: number` + `lastRotateFailed: boolean` — rotates with a server verdict; a `401`
  for a request sent before the latest rotate settled reuses its outcome (late 401s cannot cause a
  second rotate or a second `onSessionExpired`)
- `notifiedRotation: number` — the settled rotate `onSessionExpired` was last called for (dedup)

## Guarantees (each is covered by a test or the README checklist)

| # | Guarantee | Test |
| --- | --- | --- |
| G1 | Every request has `X-Requested-With: XMLHttpRequest` | mock rejects otherwise |
| G2 | `GET /csrf` runs before the first other request, at most once concurrently | optional |
| G3 | POST/PUT carry `X-CSRF-TOKEN` | mock rejects otherwise |
| G4 | N concurrent `401` → exactly one rotate → each request retried once | **required** |
| G5 | Rotate never triggers rotate (it is sent with `auth: 'none'`) | **required** (T051) |
| G6 | Rotate rejected (4xx) or repeated `401` → `onSessionExpired()` once per settled rotate + `ApiError(AuthenticationException)` | **required** (T051), incl. concurrent and late-401 variants |
| G6a | Rotate `NetworkError`/5xx → rethrown as is, session not ended | test |
| G7 | `419` → one CSRF re-fetch (shared by concurrent 419s) → one retry | test |
| G8 | Response not matching schema → `ApiError(SchemaMismatch)` | — |

## Endpoint functions (`src/api/endpoints.ts`)

These are thin typed wrappers over the client. Each one validates its response with zod.
Auth endpoints add `fingerprint: getFingerprint()` to the request body themselves; callers never
pass it (FR-004).

`GET /csrf` and `POST /auth/token/rotate` are not endpoint functions: `http-client.ts` sends them
itself (`ensureCsrf()`, `rotateOnce()`), so `endpoints.ts` depends on the client and never the
other way round.

```ts
login(input: { email; password }): Promise<{ device_session_token: string }>   // body + fingerprint
issueSession(input: { device_session_token }): Promise<void>                    // body + fingerprint
revokeSession(): Promise<void>                // body { fingerprint }
getMe(signal?): Promise<User>
listWebhooks(params: { page: number; search: string }, signal?): Promise<WebhookList>   // limit fixed to 10
getWebhook(id: number, signal?): Promise<Webhook>
updateWebhook(id: number, input: { name; url }): Promise<Webhook>
```

All of them reject only with `ApiError`, except a request aborted through its `signal` (GET
endpoints forward the TanStack Query `queryFn` signal, so `cancelQueries()` aborts requests in flight).

## Consumers

- `src/features/*` call endpoint functions from TanStack Query `queryFn`/`mutationFn`.
- `src/app/session.ts` creates the single client instance with `onSessionExpired` passed at
  creation; it calls the shared `endSession('expired')` teardown (see ui-routes.md).
- `src/mocks` imports schemas/types only, never the client.
