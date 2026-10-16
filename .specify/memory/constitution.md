<!--
Sync Impact Report
- Version change: 1.1.0 → 1.2.0 (MINOR: added local pre-commit gate)
- Development Workflow: added husky + lint-staged pre-commit with full typecheck + test;
  `--no-verify` forbidden; tooling installed in the Setup phase as the first PR.
- Earlier, 1.0.0 → 1.1.0 (MINOR: materially tightened typing rules)
- Modified principles: VII. Types as Contract — `as` forbidden everywhere except `as const`
  (was: allowed with comment); added "undefined over null" rule. Aligned with the
  react-best-practices agent skill (mastra-ai/mastra).
- Previous (1.0.0, initial ratification) added principles:
  I. Simplicity First (KISS → YAGNI → Readability → DRY)
  II. Core Correctness Over Scope
  III. Isolated Transport Layer
  IV. Single Source of Truth per State Kind
  V. Test What Is Risky
  VI. Explicit Module Boundaries
  VII. Types as Contract
  VIII. Every Error Has One Owner
- Added sections: Technology & UI Constraints; Development Workflow; Governance
- Removed sections: none
- Templates: plan/spec/tasks templates read the constitution at runtime; no edits made here.
- Deferred TODOs: none
-->

# Smart Sender Webhooks (Senior Frontend Test) Constitution

## Core Principles

### I. Simplicity First (KISS → YAGNI → Readability → DRY)

This is the meta-principle. When two rules conflict, the one further left in
**KISS → YAGNI → Readability → DRY** wins.

- Abstractions (hooks, helpers, generic components) MUST NOT be extracted before the
  **third** repetition. Two similar pieces of code are preferable to a premature abstraction.
- No "just in case" code: no generic factories, config objects, DI, plugin systems or
  middleware pipelines for a single implementation; no unused parameters or props.
- Folder and file names MUST describe their content (`session-refresh.ts`,
  `webhook-edit-form.tsx`). No `utils/`, `helpers/`, `misc/` dumping grounds.
- Nesting inside `src/` MUST NOT exceed 3 levels. One file = one responsibility;
  ~150 lines is the target ceiling — exceeding it requires a reason.
- Code MUST read top-down: explicit over clever, short functions with meaningful names,
  early returns. Comments explain *why*, not *what*; non-obvious guarantees (e.g. single-flight
  rotate) MUST be documented in a short comment.
- Every dependency MUST replace a meaningful amount of own code.
- File names use `kebab-case`; exported React components use `PascalCase`.

**Rationale**: the task is judged on readability and on architecture that matches its scale.
Aggressive DRY creates premature abstractions that hurt both.

### II. Core Correctness Over Scope

The 4-hour budget is spent in this order:

1. What is explicitly evaluated MUST be correct first: session and rotate (single-flight,
   no recursion, one retry), CSRF and 419 handling, URL state sync, server validation errors
   on fields, strict typing.
2. Optional items (419 retry polish, UI polish, extra tests) come only after (1) is done.
3. Anything unfinished MUST be listed honestly in the README "Not done / trade-offs" section.
4. No "growth" infrastructure: no monorepo, no OpenAPI codegen, no i18n, no Storybook.
   The README briefly explains how these would be introduced in the real product.

**Rationale**: seniority is shown through judgement and priorities, not code volume.

### III. Isolated Transport Layer

- All auth, CSRF and retry logic lives in one framework-agnostic HTTP client module built on
  `fetch`. It MUST NOT import React or TanStack Query.
- The client MUST: send `X-Requested-With: XMLHttpRequest` on every request; lazily fetch the
  CSRF token (single-flight) before the first other request and send it on `POST`/`PUT`;
  on `419` re-fetch CSRF and retry at most once; on `401` await one shared rotate promise and
  retry at most once; never trigger rotate from rotate; on rotate failure or a repeated `401`
  emit `onSessionExpired`.
- The client stays readable: plain functions or linear code, not a middleware chain.
- UI components and hooks MUST NOT call `fetch` directly and MUST NOT know about 401/419.
- Every API response and every form is validated with **zod** at the boundary. TS types are
  derived via `z.infer` and MUST NOT be duplicated by hand.
- Errors are normalized into a typed `ApiError` (discriminated union by `type`).
- TanStack Query `retry` MUST be disabled for 401/419 (the transport owns those).

**Rationale**: session correctness and API/state/UI separation are the top evaluation criteria;
an isolated module is the easiest to reason about and to test.

### IV. Single Source of Truth per State Kind

- Server state (me, webhooks) → TanStack Query only.
- List navigation state (`page`, `search`) → URL only, never mirrored in `useState`.
- Form state → react-hook-form only.
- No global client store; introducing one requires justification under Governance.
- `device_session_token` exists only as a local variable inside the login flow
  (`login → issue → me`); it MUST NOT be put into state, URL or any storage.
- `localStorage` holds only `fingerprint` (32 hex chars, generated once).
- Logout and session expiry MUST clear the whole TanStack Query cache and return to login.

**Rationale**: one owner per state kind removes sync bugs and makes the security rules of the
task trivially verifiable.

### V. Test What Is Risky

- The required test — two parallel requests get `401` → exactly one rotate → both retries
  succeed — is a blocking gate.
- The transport layer is written test-first (Vitest + MSW in node mode, no React).
- Extra transport scenarios are added when time allows: rotate fails → `onSessionExpired`;
  repeated `401` → no second rotate; `419` → one CSRF re-fetch and one retry; rotate never
  triggers rotate.
- One MSW mock (handlers + in-memory db) is shared by the browser and tests. Session TTL is
  configurable and tests use an `expireSession()` helper instead of fake timers.
- UI is verified with a manual checklist in the README; no component or e2e tests (documented
  trade-off).

**Rationale**: the concurrency logic is where defects hide; UI tests do not pay off at this scale.

### VI. Explicit Module Boundaries

```text
src/
  app/        router, providers, guards
  api/        http client, ApiError, zod schemas, endpoints — no React
  mocks/      MSW handlers + in-memory db (browser and tests)
  features/
    auth/     login flow, logout, useMe
    webhooks/ list (URL state), edit form, query hooks
  shared/     ui primitives (shadcn), small shared pieces
```

- Dependency direction: `app → features → api | shared`.
- `api` MUST NOT import React. Features MUST NOT import each other; shared code moves to `shared`.
- `mocks` imports only schemas/types from `api` (one contract); UI code never imports `mocks`.
- Boundaries are enforced with ESLint `no-restricted-imports`.

**Rationale**: makes API/state/UI separation visible and mechanically checked without a monorepo.

### VII. Types as Contract

- `tsconfig`: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `verbatimModuleSyntax`.
  (`exactOptionalPropertyTypes` is deliberately off — friction with RHF/shadcn.)
- Forbidden: `any`, `@ts-ignore`, non-null `!`, and `as` type assertions — in production code
  **and tests**. `as const` is the only allowed form. Narrow with zod, real type guards, query
  generics or typed fixture factories instead.
- Absence is modeled with `undefined` / optional `?`, never `null`. External `null` (API
  payloads) is converted to `undefined` at the boundary (zod schema) and MUST NOT leak inward.
- Handling of `ApiError` and other unions MUST be exhaustive (`assertNever` / `satisfies never`).
- Linting: `typescript-eslint` `strictTypeChecked`, `eslint-plugin-react-hooks`; formatting: Prettier.

**Rationale**: typing quality is an explicit evaluation criterion.

### VIII. Every Error Has One Owner

| Error | Owner | User sees |
| --- | --- | --- |
| 401 | transport: rotate → retry; else `onSessionExpired` | nothing, or login with "Сесія завершилась" |
| 419 | transport: re-fetch CSRF → one retry | nothing, or a regular error |
| 422 | form: `payload` → `setError` per field; unknown fields/`message` → `root` | error next to field |
| 404 | screen: "Вебхук не знайдено" + link to list | dedicated state |
| 400 / network / unknown | screen: error state with "Повторити" | dedicated state |
| zod mismatch on response | transport: `ApiError` `SchemaMismatch` (+ `console.error` in dev) | as unknown error |

- No global error toasts; a toast is allowed only for successful save.
- Client-side zod rules mirror the server (name required, URL is http/https), but the server is
  the source of truth: a `422` is always displayed.
- Submit is disabled while a mutation is pending.

**Rationale**: a single map prevents each feature from inventing its own error handling.

## Technology & UI Constraints

- **Stack**: Vite, React, TypeScript (strict), TanStack Query, TanStack Router (code-based,
  zod `validateSearch`), react-hook-form + zod, MSW, Vitest, Tailwind CSS v4 + shadcn/ui, pnpm.
- **URL state**: search input is debounced and written with `replace`, resetting `page` to 1;
  pagination uses `push`; invalid params normalize to defaults via the schema; the list uses
  `placeholderData: keepPreviousData`.
- **UI**: thin components that render and delegate. Every async screen handles loading, empty,
  error (with retry) and success. Semantic markup (`<table>`, `<label for>`, `aria-invalid` +
  `aria-describedby` for field errors). UI language is Ukrainian, plain strings, no i18n library.
- **Brand (smartsender.com)**: expressed only through theme tokens in one `theme.css` mapped to
  shadcn CSS variables — primary `#1380F6` (hover `#2276D2`), text `#232323`, muted `#595959`,
  surfaces `#FFFFFF`/`#FAFAFA`/`#F6F7F9`, borders `#E9ECEF`, success `#40C057`,
  destructive `#EB5757`; Montserrat (headings, buttons) + Open Sans (body) self-hosted via
  `@fontsource`; pill buttons, ~8px radius for cards/inputs; light theme only. No hard-coded hex
  in components. Company logo and assets MUST NOT be copied — a text wordmark is used.
- **Security**: no tokens in state, URL or storage; only `fingerprint` in `localStorage`.

## Development Workflow

- Public GitHub repository on account `MarkupChef`; Node version pinned (`.nvmrc` + `engines`),
  lockfile committed.
- After `/speckit-tasks`, one GitHub issue per user story/phase (not per task) is created via
  `gh` CLI, containing the checklist of its `T0xx` tasks. `tasks.md` stays the source of truth.
- Flow per issue: branch `feat/<n>-<slug>` → small atomic Conventional Commits → PR with
  `Closes #n`, a short decision summary and self-review → GitHub Actions CI green
  (`typecheck`, `lint`, `test`) → **merge is performed manually by the repository owner**.
- **Local gate (pre-commit, husky)**: lint-staged runs `prettier --write` + `eslint --fix` on
  staged files, then the full `typecheck` (`tsc --noEmit`) and `test` (`vitest run`) run.
  A failing hook blocks the commit — broken code never reaches GitHub. Bypassing hooks
  (`--no-verify`) is forbidden. The suite MUST stay fast enough for this (no e2e).
- **Remote gate (CI)**: the same `typecheck`, `lint`, `test` run on every PR; a red CI blocks merge.
- Tooling (ESLint, Prettier, husky + lint-staged, CI workflow) is installed in the Setup phase,
  as the first issue/PR, before any feature code.
- Quality gate before handover: `typecheck`, `lint`, `test` pass with zero errors and warnings.
- Spec Kit artifacts (`.specify/`, `specs/`) are committed.
- README MUST contain: how to run the app and the test, test credentials, key decisions (with a
  reference to this constitution), not done / trade-offs, how it would scale (OpenAPI codegen,
  monorepo, i18n, e2e), actual time spent, and an honest note that development was spec-driven
  with Claude Code + Spec Kit.

## Governance

- This constitution supersedes specs, plans and tasks. Plans MUST include a constitution check.
- Any deviation MUST be recorded with justification in `plan.md` Complexity Tracking or the README.
- Amendments: update this file with a Sync Impact Report and bump the version by semver —
  MAJOR for removed/redefined principles, MINOR for added/materially expanded ones, PATCH for
  clarifications.
- Every PR self-review verifies compliance with these principles.

**Version**: 1.2.0 | **Ratified**: 2026-10-16 | **Last Amended**: 2026-10-16
