# Design Decisions

## Assumptions

- Staff mainly work on the inquiries they record themselves, while a manager (admin) needs to see everything.
- One status per inquiry is enough. Assigning inquiries to other staff is out of scope for this version.
- Users are seeded. Registration and password reset are out of scope.
- The app is for a small team, so a list capped at 100 rows is acceptable.

## Key design choices

**1. Access rule enforced in the API.**
Staff see only the inquiries they created, and admins see all of them. The rule lives in one place (`services/access.js`). It is applied in the SQL for the list and as a check for single records, including status changes. If a user can't access an inquiry, the API returns **404, not 403**, so it never confirms that the ID exists. The frontend shows the same message for "does not exist" and "not allowed". I tested this by opening Staff One's link as Staff Two, and by calling the API directly without the UI.

**2. Status rules as a lookup table.**
`services/statusRules.js` defines the allowed transitions:

- New → In Progress
- In Progress → New (undo a mistaken start) or Resolved
- Resolved → In Progress (reopen)

New → Resolved is blocked so an inquiry must be picked up before it is closed. Reopening is allowed because customers often reply after something is resolved. An invalid change returns 409 with the code `INVALID_TRANSITION` and lists the allowed options. The API also sends `allowed_transitions`, so the UI only shows valid buttons and cannot drift from the server rules.

**3. Optimistic concurrency for stale data.**
Each inquiry has a `version` number. The client sends the version it last saw, and if it no longer matches, the API returns 409 `STALE_VERSION`. The row is locked with `SELECT ... FOR UPDATE` inside a transaction, so two simultaneous requests are handled one after the other. The UI then reloads the latest copy and shows a notice.

**4. Missing data and duplicates.**
Required fields and length limits are checked in three places:

- the browser, for fast, friendly feedback
- the API (Zod), which never trusts the UI
- database `CHECK` constraints, as a last line of defence

A duplicate (same user, contact and subject within 5 minutes) returns 409 with a link to the existing inquiry. The submit button is also disabled while saving. I chose this simple rule instead of building a deduplication engine, as the brief suggested.

**5. Extra feature: status history.**
An `inquiry_events` table records who changed the status, from what, to what, and when. It directly answers the brief's problem of "what happened last". It is written in the same transaction as the status change, so the two can never disagree.

## Other technical choices

- **JWT in an httpOnly cookie**, not localStorage, so scripts running in the page cannot read the token. `requireAuth` runs on every inquiry route and re-checks the user in the database.
- **`bcryptjs`** instead of `bcrypt`, to avoid native build problems on Windows.
- **Plain SQL with `pg`** and a small migration runner, to keep the data layer easy to read and explain.
- **Vite + React** rather than Next.js, because the API is a separate Express server and I don't need Next's server features.
- **Vite dev proxy** for `/api`, which avoids CORS problems and keeps the cookie same-origin.
- **UUIDs** for inquiry IDs, so they can't be guessed or counted.

## Trade-off I accepted

When two tabs show the same inquiry and one changes it, the other tab is **not updated live**. If the user acts on the stale copy, the server rejects the change and the UI reloads the latest version with an explanation, so the user has to repeat the action. I accepted one extra click in exchange for avoiding websockets or polling, which the brief says are not needed. The important guarantee is that a change is never silently overwritten.

## Testing

- **Backend (Vitest + Supertest, real database):** missing authentication returns 401, invalid input returns 400 with field names, duplicates are rejected, another staff member gets 404 while an admin can see the inquiry, invalid transitions are rejected, and a stale version is rejected.
- **Frontend (Vitest + Testing Library, fake API):** the create form shows errors and doesn't call the API when empty, a failed save shows the message and keeps what the user typed, and the list shows its empty, error and data states.

### Testing gaps

- Backend tests run against the development database (with cleanup of `TEST_` rows) instead of a separate test database.
- No automated test for the detail page or the stale-version notice. I verified it manually with two browser tabs.
- No end-to-end test connecting browser, API and database.
- The search debounce and the exact-same-instant duplicate race are untested.

## Known limitations

- Two identical submissions at the exact same instant could both pass the duplicate check, because there is no unique constraint.
- If search requests finish out of order, an older response could briefly overwrite a newer one.
- The list shows at most 100 inquiries, with no pagination.
- The cookie is only marked `secure` when `NODE_ENV=production`.

## What I would improve next

1. Cancel outdated search requests so the list always matches the latest input.
2. Add a separate test database and an end-to-end test of the two-tab scenario.
3. Add pagination, assignment of inquiries to other staff, and rate limiting on login.
4. Set up HTTPS and production cookie settings for deployment.

## Use of AI

I used Claude (an AI assistant) throughout this project: to plan the architecture, scaffold the backend and frontend, and draft the code, the tests and this document. I built it step by step, ran every command myself, and fixed the real errors that came up along the way.

- **Accepted:** I accepted the proposed design decisions (404 for inaccessible records, version-based stale-data handling, status history) after understanding the reason for each.
- **Changed:** The AI suggested `bcrypt`, but we switched to `bcryptjs` because the native version often fails to build on Windows.
- **Fixed:** When I ran the code, my `package.json` had two `"type"` entries (`module` and `commonjs`), so Node ignored the one I added. I removed the duplicate. A frontend test also failed because "In Progress" appeared in both the filter dropdown and the status badge, so I changed the test to look only inside the table row.
- **Rejected / considered:** I considered Next.js but kept Vite with a separate Express API, because the brief requires Node/Express and I don't need Next's server features. I also considered real-time updates (websockets) for the two-tab case, but chose a version check with a clear "reload" message instead, since the brief says real-time updates aren't needed and I wanted a solution I could fully explain.