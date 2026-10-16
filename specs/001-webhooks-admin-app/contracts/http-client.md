# Contract: Transport module (`src/api`)

This is the public surface that features consume. It is framework-agnostic: no React and no
TanStack Query imports (Principle III).

## Factory

```ts
createHttpClient(options: {
  baseUrl: string;                 // window.location.origin | 'http://localhost' in tests
  onSessionExpired: () => void;    // called once per failed rotate (inside rotateOnce) or per repeated 401; the app handler must be idempotent
}): HttpClient

type RequestOptions = {
  method: 'GET' | 'POST' | 'PUT';
  path: string;
  body?: unknown;
  auth: 'session' | 'none';
  captcha?: boolean;
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

## Guarantees (each is covered by a test or the README checklist)

| # | Guarantee | Test |
| --- | --- | --- |
| G1 | Every request has `X-Requested-With: XMLHttpRequest` | mock rejects otherwise |
| G2 | `GET /csrf` runs before the first other request, at most once concurrently | optional |
| G3 | POST/PUT carry `X-CSRF-TOKEN` | mock rejects otherwise |
| G4 | N concurrent `401` → exactly one rotate → each request retried once | **required** |
| G5 | Rotate never triggers rotate | **required** (T051) |
| G6 | Rotate failure or repeated `401` → `onSessionExpired()` + `ApiError(AuthenticationException)` | **required** (T051); concurrent variant optional |
| G7 | `419` → one CSRF re-fetch → one retry | optional |
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
getMe(): Promise<User>
listWebhooks(params: { page: number; search: string }): Promise<WebhookList>   // limit fixed to 10
getWebhook(id: number): Promise<Webhook>
updateWebhook(id: number, input: { name; url }): Promise<Webhook>
```

All of them reject only with `ApiError`.

## Consumers

- `src/features/*` call endpoint functions from TanStack Query `queryFn`/`mutationFn`.
- `src/app` creates the single client instance and wires `onSessionExpired` to clear the cache and
  navigate to the login screen.
- `src/mocks` imports schemas/types only, never the client.
