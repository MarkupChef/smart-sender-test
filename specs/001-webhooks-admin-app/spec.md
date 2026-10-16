# Feature Specification: Webhooks Admin App (Smart Sender Senior Frontend Test)

**Feature Branch**: `001-webhooks-admin-app`

**Created**: 2026-10-16

**Status**: Draft

**Input**: User description: "файл ./docs/smart-sender-senior-frontend-test.md" — a small application with sign-in, a webhook list and webhook editing, running against a simulated API that follows the contract defined in that document.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign in and reach the webhook list (Priority: P1)

A user opens the app, enters the email and password of the single test account and lands on the
webhook list, with their name visible. Wrong credentials show an error next to the relevant field.
Secrets used during sign-in never become visible to the page, the address bar or browser storage.

**Why this priority**: nothing else is reachable without a session; correct session establishment
is the first evaluated criterion.

**Independent Test**: open the app, sign in with the README credentials → webhook list and the
user's name are shown; sign in with a wrong password → field error, user stays on the sign-in screen.

**Acceptance Scenarios**:

1. **Given** a signed-out user on the sign-in screen, **When** they submit valid credentials,
   **Then** a session is started, the current user's profile is loaded and the webhook list opens.
2. **Given** a signed-out user, **When** they submit a wrong password, **Then** the server's
   validation message appears next to the corresponding field and no session is started.
3. **Given** a first-ever visit, **When** the app needs a device identifier, **Then** a stable
   32-hex-character identifier is generated once, kept in the browser and reused on all later
   visits and in all sign-in/session requests.
4. **Given** sign-in completed, **When** the browser storage and address bar are inspected,
   **Then** neither the one-time device session token nor any session token is present there.
5. **Given** a signed-out user, **When** they open a protected address directly (e.g. a list
   page with search), **Then** they are sent to sign-in and, after signing in, the list parameters
   from the original address are applied.

---

### User Story 2 - Session stays alive transparently and ends cleanly (Priority: P1)

The session is short-lived (30 seconds). While the user works, expired sessions are renewed
silently and the interrupted request is repeated, so the user notices nothing. If renewal is
impossible, the user is returned to sign-in with a "session ended" message. The user can sign out
at any time, after which none of their data remains in the app.

**Why this priority**: session renewal correctness (shared renewal, single retry, no renewal loops)
is the most heavily evaluated part of the task and is covered by the mandatory automated test.

**Independent Test**: sign in, wait more than 30 seconds, navigate or change the page → data loads
without visible interruption; the automated test proves two parallel expired requests cause exactly
one renewal and both succeed on retry.

**Acceptance Scenarios**:

1. **Given** an expired session, **When** a protected request is rejected as unauthenticated,
   **Then** the session is renewed once and the request is repeated once, and the user sees the result.
2. **Given** an expired session, **When** two or more protected requests are rejected at the same
   time, **Then** exactly one renewal happens and all of them are repeated after it completes.
3. **Given** renewal fails, or the repeated request is rejected as unauthenticated again,
   **When** that happens, **Then** the local session ends, all user data is cleared and the user
   sees the sign-in screen with a "session ended" message.
4. **Given** a renewal request itself, **When** it fails, **Then** it never triggers another renewal.
5. **Given** a signed-in user, **When** they sign out, **Then** the server session is revoked,
   all locally held user data is discarded and the sign-in screen is shown.
6. **Given** a fresh page load, **When** the app starts, **Then** it is acceptable that the user
   must sign in again (no session survives reload on the client side).

---

### User Story 3 - Browse and search webhooks (Priority: P2)

A signed-in user sees a table of webhooks (name, URL, active status), 10 per page, can move between
pages and search by name. The current page and search are reflected in the address, so reload,
sharing the address, and browser back/forward restore exactly the same view.

**Why this priority**: the main working screen and the "URL state" evaluation criterion; depends on US1.

**Independent Test**: sign in, search "a", go to page 2, reload → same search and page shown;
press back → previous page/search restored; search for a nonsense string → empty state.

**Acceptance Scenarios**:

1. **Given** the list screen, **When** it loads, **Then** the first 10 webhooks in stable order are
   shown with name, URL and active status, plus pagination reflecting the total.
2. **Given** a list on page 2, **When** the user changes the search text, **Then** the list resets
   to page 1 and shows only webhooks whose name contains the text (case-insensitive).
3. **Given** a page and search in the address, **When** the user reloads or navigates back/forward,
   **Then** the same page and search are restored and applied.
4. **Given** an address with an invalid page or search value, **When** it is opened, **Then** the
   values fall back to defaults (page 1, no search) instead of producing an error.
5. **Given** a search with no matches, **When** results arrive, **Then** an empty-state message is shown.
6. **Given** a loading or failing request, **When** it is in progress or fails, **Then** a loading
   indicator or an error state with a "Повторити" (retry) action is shown; while switching pages the
   previous data stays visible until new data arrives.

---

### User Story 4 - Edit a webhook (Priority: P3)

From the list, the user opens a webhook, changes its name and/or URL and saves. Invalid input is
reported next to the specific field — both by immediate client-side checks and by the server.

**Why this priority**: completes the CRUD-lite flow and the "forms and errors" criterion; depends on US1 and US3.

**Independent Test**: open a webhook, clear the name → field error; enter `ftp://x` as URL and save →
server error shown under URL; enter valid values and save → success notice, list shows new values.

**Acceptance Scenarios**:

1. **Given** the list, **When** the user selects a webhook, **Then** an edit screen opens with its
   current name and URL pre-filled.
2. **Given** the edit form, **When** the user submits valid changes, **Then** the webhook is saved,
   a success notice is shown and the updated values appear in the list.
3. **Given** the server rejects the data, **When** it returns field errors, **Then** each message is
   shown next to its field; errors not tied to a known field are shown at the form level.
4. **Given** a save in progress, **When** the user tries to submit again, **Then** submission is
   blocked until the current save finishes.
5. **Given** a webhook address that does not exist, **When** it is opened, **Then** a "Вебхук не
   знайдено" state with a link back to the list is shown.
6. **Given** the user returns from the edit screen to the list, **When** the list opens, **Then** the
   previously active page and search are preserved.

---

### Edge Cases

- Session expires while the edit form is being saved → save is renewed-and-retried transparently;
  if renewal fails the user is returned to sign-in.
- Request rejected because of a missing/invalid anti-forgery token (419) → the token is re-obtained
  and the request repeated at most once; a second failure shows a regular error.
- Several requests start before the anti-forgery token has been obtained → the token is fetched only once.
- Sign-in attempted with an empty email/password → client-side field errors, no request sent.
- Page number beyond the last page (e.g. after searching) → user sees the empty state, can return to page 1.
- Network failure or unexpected server response shape → generic error state with retry; nothing crashes.
- Rapid typing in the search box → address and request update only after typing pauses, without
  flooding history with one entry per keystroke.
- Sign-out request fails → local session is still cleared and the sign-in screen shown.

## Requirements *(mandatory)*

### Functional Requirements

**Sign-in and session**

- **FR-001**: The app MUST provide a sign-in form with email and password; test credentials MUST be documented in the README.
- **FR-002**: On successful credential check the app MUST exchange the received one-time device session token for a session, load the current user's profile and open the webhook list.
- **FR-003**: The one-time device session token MUST exist only transiently in memory during sign-in — never in browser storage, the address, or long-lived app state.
- **FR-004**: The app MUST generate a stable device identifier (32 hex characters) once, keep it in browser storage, and send it in every sign-in/session request as the contract requires. It is the only value the app keeps in browser storage.
- **FR-005**: Session credentials MUST NOT be readable by the app; the session is held by the simulated server (equivalent of an HttpOnly cookie).
- **FR-006**: When a protected request is rejected as unauthenticated, the app MUST renew the session and repeat that request exactly once.
- **FR-007**: Concurrent unauthenticated rejections MUST share a single in-flight renewal; a renewal request MUST never trigger another renewal.
- **FR-008**: If renewal fails or the repeated request is rejected again as unauthenticated, the app MUST end the local session, clear all cached user data and show the sign-in screen with a "session ended" message.
- **FR-009**: Sign-out MUST revoke the server session, clear local state and all cached user data, and show the sign-in screen.
- **FR-010**: Protected screens MUST be inaccessible without a session; the originally requested list parameters MUST be applied after sign-in.

**Anti-forgery (CSRF) and request conventions**

- **FR-011**: Every request MUST carry the header identifying it as an XHR (`X-Requested-With: XMLHttpRequest`).
- **FR-012**: Before the first other API request, the app MUST obtain the anti-forgery token once and send it on every state-changing (POST/PUT) request.
- **FR-013**: On an anti-forgery rejection (419) the app SHOULD re-obtain the token and repeat the request at most once.

**Webhook list**

- **FR-014**: The list MUST show name, URL and active status for each webhook in a table.
- **FR-015**: The list MUST be paginated with 10 items per page and searchable by name (case-insensitive substring).
- **FR-016**: Page and search MUST be stored in the address and restored on reload and on browser back/forward; invalid values MUST fall back to defaults.
- **FR-017**: Changing the search MUST reset the page to 1; search input MUST be debounced and MUST NOT add a history entry per keystroke, whereas page changes MUST be navigable with back/forward.
- **FR-018**: The list MUST present distinct loading, empty, error (with retry) and success states.

**Webhook editing**

- **FR-019**: The user MUST be able to edit a webhook's name and URL on a dedicated edit screen opened from the list; active status is read-only.
- **FR-020**: Client-side validation MUST mirror server rules (name required; URL must be a valid HTTP/HTTPS address), but server validation errors MUST always be displayed next to the matching field, and unmatched errors at form level.
- **FR-021**: Submission MUST be disabled while a save is in progress; a successful save MUST show a success notice and refresh the affected list data.
- **FR-022**: A non-existent webhook MUST show a dedicated "not found" state with a link to the list.

**Errors**

- **FR-023**: Each error class MUST have exactly one handler: unauthenticated → session renewal (FR-006–008); anti-forgery → token refresh (FR-013); validation → form fields; not found → dedicated state; bad request / network / unknown / unexpected response shape → screen error state with retry. No global error pop-ups; only successful save produces a notice.
- **FR-024**: All server responses MUST be validated against the contract; a response not matching it MUST be treated as an unknown error.

**Simulated API (mock)**

- **FR-025**: The app MUST ship with a simulated API implementing exactly the contract in `docs/smart-sender-senior-frontend-test.md` (endpoints, statuses, response and error formats), used both in the browser and in the automated test.
- **FR-026**: The mock MUST hold one user with fixed credentials and 25–30 webhooks, keep all state in memory only, and return results in stable order.
- **FR-027**: The mock MUST require a non-empty captcha header on sign-in, reject a wrong password with a field-level validation error, and reject invalid webhook data (empty name, non-HTTP/HTTPS URL) with field-level validation errors.
- **FR-028**: The mock MUST expire sessions 30 seconds after issue/renewal (renewal extends by 30 seconds), reject renewal before issue and after revoke, and check the fixed anti-forgery token on POST/PUT before performing the operation.
- **FR-029**: List responses MUST report the total after search and the page size; pages start at 1.

**Verification and delivery**

- **FR-030**: The project MUST include an automated test: two parallel requests rejected as unauthenticated → exactly one renewal → both repeated requests succeed.
- **FR-031**: The README MUST describe how to run the app and the test, the test credentials, key decisions, unfinished items/trade-offs, and time spent.

### Key Entities

- **User**: the single account — id, email, first name, last name, display name.
- **Webhook**: id, name, URL, active flag, creation timestamp. Name and URL are editable.
- **Webhook page**: a slice of webhooks plus paging info — current and last page, total results after search, page size.
- **Device identifier**: stable per-browser 32-hex identifier bound to sign-in and session operations.
- **Session**: server-held, 30-second lifetime, renewable, revocable; invisible to the app.
- **API error**: typed error with a category (bad request, unauthenticated, not found, token mismatch, validation), message and, for validation, per-field messages.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with the documented credentials reaches the webhook list in under 30 seconds from opening the app.
- **SC-002**: During a 3-minute working session (several session expiries), the user is never sent back to sign-in and sees no error caused by expiry.
- **SC-003**: In 100% of runs, N concurrent expired requests produce exactly 1 renewal and N successful retries (verified by the automated test for N = 2).
- **SC-004**: Reloading or using back/forward on any list view restores the same page and search in 100% of manual checks.
- **SC-005**: Every server validation error for name or URL is displayed next to its field in 100% of manual checks.
- **SC-006**: After sign-out or forced session end, no previously loaded user or webhook data is visible or retrievable in the app, and browser storage contains only the device identifier.
- **SC-007**: The project's type-check, lint and test steps finish with zero errors and zero warnings.
- **SC-008**: The core scope (US1–US2 and the mandatory test) is complete within the 4-hour budget; any unfinished item is listed in the README.

## Assumptions

- Editing happens on a dedicated screen (not a modal) — it gives a shareable address and a natural place for the "not found" state.
- Only name and URL are editable; active status, creation and deletion of webhooks are out of scope (not in the contract).
- Session does not survive a page reload; re-signing in after reload is acceptable per the mock rules, and list parameters in the address are still applied.
- The captcha header is sent with a fixed non-empty placeholder value; no captcha widget is shown.
- UI language is Ukrainian; a single light theme with Smart Sender brand colors and fonts; no company logo/assets are copied.
- Visual design is not evaluated; standard web desktop browsers are targeted, mobile polish is out of scope.
- Only the one mandatory automated test is required; extra session/CSRF scenarios are added if time allows; UI is verified manually via a README checklist.
- Stack and engineering rules are fixed by the project constitution (`.specify/memory/constitution.md`) and are applied at planning, not in this spec.
