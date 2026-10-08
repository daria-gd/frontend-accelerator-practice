# Implementation Plan: Training Sessions Workspace

Task ID: `training-sessions-workspace`

Revision 2. This revision simplifies the plan to fit the six-hour Basic Onboarding timebox. See the "Revision notes" at the end.

Source of truth for scope: `tasks/training-sessions-workspace/requirements.md` (FR-1 to FR-9, decisions Q1–Q9). Also read: `frontend-accelerator-onboarding/TASK.md`, `README.md`, `PASS_CRITERIA.md`, `package.json`, `vite.config.ts`, `tsconfig*.json`, `.oxlintrc.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, and the coder and api-integration rulesets.

Library facts were checked against current documentation (Context7):
- Vitest 5 has a peer dependency on `vite ^6.4.0 || ^7.0.0 || ^8.0.0` and requires Node `^22.12.0 || ^24.0.0 || >=26.0.0`.
- MSW 2 supports `{ once: true }` handlers.
- `server.use()` / `worker.use()` overrides take precedence over the default handlers.

Runtime: Runtime Doctor confirmed **Node.js 24.21.0 (PASS)**, which is within Vitest 5's supported range.

## 1. Approach and decisions

### Current behavior

`src/App.tsx` is the Vite starter screen. There is no data layer, mocking, test tooling, `test` script, or router.

### Intended behavior

A single "Training sessions" screen that:
- loads sessions with `fetch` from `/api/sessions`, answered by MSW (Mock Service Worker) in development and tests;
- provides an `All` / `scheduled` filter;
- has an inline create form with validation;
- shows recoverable list and create errors.

### Decisions

**Q3 – Form presentation (unchanged).**
- The form is inline and opened by a "New session" button.
- On success it closes and resets.
- On failure it stays open with the values kept.
- Why: it is the simplest accessible option, with no dialog or focus management.

**Q5 – Tools (unchanged choice; config placement changed).**
- Test runner: Vitest 5 with jsdom.
- UI utilities: `@testing-library/react`, plus its peer `@testing-library/dom` and `@testing-library/user-event`.
- HTTP mocking: MSW 2.
- Not added: `jest-dom`.
- New `package.json` script: `"test": "vitest run"`.
- **Change:** test configuration goes in a new `vitest.config.ts`, and test files go in a top-level `tests/` folder. Section 3 explains why.

**Q7 – Error scenario (manual mechanism changed so recovery can be shown).**
- **Automated:** the test overrides the list request once: `server.use(http.get('/api/sessions', () => new HttpResponse(null, { status: 500 }), { once: true }))`. The first load fails and Retry succeeds.
- **Manual:** open the app URL with `?mock=list-error`.
  - In development, `main.tsx` then registers one list handler that returns 500 for **list requests made within the first 2 seconds** after the worker starts. After that, the default handler answers normally.
  - So the initial load fails, the error and Retry button appear, and a Retry clicked after that window shows the list.
  - Why the change: the previous persistent handler could only show repeated failure. A `once` handler can't work manually either, because React `StrictMode` sends the first request twice in development and the discarded request would use up the failure. A short time window is not affected by that double request and needs no app code changes.
- Removed: the `?mock=create-error` switch. Create-failure behavior (FR-7) is verified by code review and by optional test O1.

**Q9 – New session placement (unchanged).**
- A new session is added to the end of the list. The mock appends it too, so the order matches the API (consistent with Q8).

## 2. Request boundary and mock

### Data shapes (`src/sessions/types.ts`)

```ts
export type SessionStatus = 'scheduled' | 'completed'
export interface TrainingSession { id: string; title: string; status: SessionStatus; startsAt: string } // startsAt: ISO 8601
export interface CreateSessionInput { title: string; startsAt: string }
```

### Client (`src/sessions/sessionsClient.ts`)

This is the only module that knows the URL or calls `fetch`. It contains two plain functions; there is no class, interface layer, or configuration object.

- `listSessions(): Promise<TrainingSession[]>`: sends `GET /api/sessions`.
- `createSession(input): Promise<TrainingSession>`: sends `POST /api/sessions` with a JSON body `{ title, startsAt }`. The client sends no status; the API assigns `scheduled` (Q2).
- If `!response.ok`, throw an `Error`. The UI shows its own friendly text.
- Narrow the parsed JSON with a minimal shape check (for example, it is an array, or an object with a string `id`) instead of an unchecked cast. Don't add a validation library.
- Build URLs as `new URL('/api/sessions', window.location.origin)`. The Node `fetch` that tests use rejects relative URLs. jsdom's origin is `http://localhost:3000`, and MSW matches by path.

### Mock (`src/mocks/`)

- `handlers.ts`:
  - An in-memory array seeded with 4–5 sessions, at least one `scheduled` and one `completed` (AC-1.6). Use fixed dates far from today, for example in 2099 and 2020.
  - `GET /api/sessions` returns the array.
  - `POST /api/sessions` appends `{ id: crypto.randomUUID(), status: 'scheduled', ...body }` and returns it with status `201`.
  - Both handlers `await delay()`. MSW's default delay makes the loading state visible in the browser; tests rely on `findBy*` queries either way.
  - Export `handlers` and `resetSessions()`. Tests call `resetSessions()` so each test starts from the seed data.
- `browser.ts`: `export const worker = setupWorker(...handlers)`.
- `public/mockServiceWorker.js`: generated by `npx msw init public --save`. Don't edit it by hand.
- `src/main.tsx`:
  - If `import.meta.env.DEV`, dynamically import `./mocks/browser`.
  - If the URL has `?mock=list-error`, call `worker.use(...)` with the time-window 500 handler.
  - Then `await worker.start({ onUnhandledRequest: 'bypass' })` and render. Keep `StrictMode`.

### Real-API replacement

Remove the development-only MSW block from `main.tsx`, and delete `src/mocks/` and `public/mockServiceWorker.js`. If the API is not same-origin `/api`, change the base URL in `sessionsClient.ts`. No component changes are needed.

## 3. Files to create or modify

| File | Action | Why |
| --- | --- | --- |
| `package.json`, `package-lock.json` | Modify (via `npm install -D`, `msw init --save`) | devDependencies, `test` script, `msw.workerDirectory` |
| `public/mockServiceWorker.js` | Create (generated) | MSW in the browser |
| `vitest.config.ts` | Create | `defineConfig` from `vitest/config` with `plugins: [react()]` and `test: { environment: 'jsdom', include: ['tests/**/*.test.tsx'], setupFiles: ['./tests/setup.ts'] }`. Leaves `vite.config.ts` unchanged. |
| `tests/setup.ts` | Create | Creates `setupServer(...handlers)` from `msw/node` and wires it into Vitest's lifecycle (see below) |
| `tests/SessionsWorkspace.test.tsx` | Create | The mandatory test, plus any optional tests |
| `src/sessions/types.ts`, `src/sessions/sessionsClient.ts` | Create | Data shapes and request boundary |
| `src/mocks/handlers.ts`, `src/mocks/browser.ts` | Create | Mock data and handlers |
| `src/main.tsx` | Modify | Start MSW in development, then render |
| `src/sessions/SessionsWorkspace.tsx` | Create | List, loading, error and Retry, filter, empty message, "New session" toggle |
| `src/sessions/CreateSessionForm.tsx` | Create | Fields, validation, submit, pending guard, create error |
| `src/App.tsx` | Modify | Render `<SessionsWorkspace />` instead of the starter markup |
| `src/App.css` | Modify | Replace the starter rules with minimal layout. `index.css` and `src/assets/*` stay untouched. |

`tests/setup.ts` wiring:
- `beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))`.
- `afterEach`: `server.resetHandlers()`, `resetSessions()` and RTL's `cleanup()`. `cleanup` must be called explicitly because Vitest `globals` is off.
- `afterAll(() => server.close())`.

No changes to `vite.config.ts`, `tsconfig*.json`, `.oxlintrc.json`, `index.html` or the rulesets.

### Why `tests/` and `vitest.config.ts` (TypeScript build review)

- `npm run build` runs `tsc -b`, which type-checks:
  - `tsconfig.app.json`: `include: ["src"]`, `types: ["vite/client"]`, `lib: DOM`;
  - `tsconfig.node.json`: `include: ["vite.config.ts"]`.
- Test code inside `src/` would be type-checked against that app config. In particular, `msw/node` and Vitest's Node-oriented types could fail there. The previous plan's only fix was a `tsconfig` change.
- With tests and setup in `tests/`, and Vitest config in `vitest.config.ts`, neither is in any `tsconfig` include. `tsc -b` ignores them, and Vitest transpiles them without type-checking.
- Everything under `src/` imports only `msw` (browser-safe) and the app's own code. So the build sees the same kind of code as today, and **all tsconfig files stay unchanged**.
- Trade-off: the test files are not type-checked by `npm run build`. Editors may treat them as loose files. This is acceptable for onboarding.

## 4. Ordered steps

Step 2 can run in parallel with step 1. Steps 3 and 4 need step 2. Step 5 needs steps 3 and 4.

1. **Tooling.**
   - Run `npm install -D vitest@^5 jsdom @testing-library/react@^16 @testing-library/dom @testing-library/user-event@^14 msw@^2`.
   - Run `npx msw init public --save`.
   - Add the `test` script. Create `vitest.config.ts` and `tests/setup.ts`.
   - *Outcome:* `npm run build` still passes. *ACs:* AC-8.2 (enabler).
2. **Boundary and mock.**
   - Create `types.ts`, `sessionsClient.ts`, `handlers.ts` and `browser.ts`.
   - Update `main.tsx`, including the `?mock=list-error` time-window override.
   - *Outcome:* `npm run dev` serves `GET /api/sessions` from MSW. *ACs:* AC-1.1, AC-1.5, AC-1.6, AC-2.3, AC-6.1, AC-6.3, Q9.
3. **List screen** (`SessionsWorkspace.tsx`).
   - Load in `useEffect`, with an `ignore` flag in cleanup to discard stale results.
   - **Loading:** "Loading sessions…" (`role="status"`). The list is not shown as empty.
   - **Error:** "Couldn't load sessions." (`role="alert"`) plus a `Retry` button that re-runs the load.
   - **Filter:** a labelled `<select>`, "Status", with options `All` and `Scheduled`. It defaults to `All`, and the filtered list is computed during render.
   - **Empty filter result:** "No scheduled sessions."
   - **List items:** title, status, and start date/time formatted with `Intl.DateTimeFormat` (local time).
   - *ACs:* AC-1.1–1.5, AC-2.1–2.2, AC-3.1–3.4.
4. **Create form** (`CreateSessionForm.tsx` and the "New session" toggle).
   - **Fields:** labelled `Title` and `Start date and time` (`type="datetime-local"`).
   - **On submit:**
     - The title must be 3–80 characters after trimming. Otherwise show "Title must be 3–80 characters."
     - The date must be set and later than `Date.now()`. Otherwise show "Start must be a future date and time."
     - Send no request while either check fails.
   - **While pending:** disable submit and ignore re-submits in the handler.
   - **On success:**
     - the parent appends the session;
     - if the active filter would hide it, the parent resets the filter to `All` (this is one line);
     - the form closes and resets.
   - **On failure:**
     - show "Couldn't create the session. Please try again." (`role="alert"`);
     - keep the values;
     - re-enable submit;
     - add nothing to the list.
   - *ACs:* AC-4.1–4.3, AC-5.1–5.4, AC-6.1–6.5, AC-7.1–7.4.
5. **Wire up, test, check.**
   - `App.tsx` renders the workspace; update `App.css`.
   - Write the mandatory test M, and the optional tests if time allows.
   - Run test, lint and build (section 7).
   - *ACs:* AC-8.1, AC-8.2, AC-9.1.

## 5. Traceability

| AC | Step | Verified by |
| --- | --- | --- |
| AC-1.1 request via boundary | 2, 3 | **M**, manual B1 |
| AC-1.2 loading visible | 3 | **M** (asserts the loading status first), B1 |
| AC-1.3 title, status, date/time | 3 | **M**, B1 |
| AC-1.4 API order | 2, 3 | B1; review (no sorting code) |
| AC-1.5 no hard-coded data in UI | 2 | Review (data only in `src/mocks/`) |
| AC-1.6 seed has both statuses | 2 | B1, B2 |
| AC-2.1 error message | 3 | B4; optional O2 |
| AC-2.2 Retry recovers | 3 | B4 (shows the list after Retry); optional O2 |
| AC-2.3 reproducible trigger | 2 | B4 (`?mock=list-error`); O2 (`once` override) |
| AC-3.1 `All` + `scheduled` only | 3 | B2; optional O3 |
| AC-3.2 `All` default | 3 | B2; O3 |
| AC-3.3 filter and restore | 3 | B2; O3 |
| AC-3.4 empty-filter message | 3 | Review; optional O3 (with a GET override returning only `completed`) |
| AC-4.1 control opens form | 4 | **M**, B3 |
| AC-4.2 labelled inputs | 4 | **M** (queries by label) |
| AC-4.3 inline | 4 | B3 |
| AC-5.1 trimmed 3–80 | 4 | **M** (a padded title is saved trimmed); B3; optional O4 (bounds) |
| AC-5.2 exactly 3 / 80 accepted | 4 | Review; optional O4 |
| AC-5.3 missing or past date rejected | 4 | B3; optional O4 |
| AC-5.4 messages, no request | 4 | B3; optional O4 |
| AC-6.1 one request, trimmed title, no status | 2, 4 | **M** (trimmed title shown, `scheduled` status from the API); review |
| AC-6.2 no duplicate submit | 4 | B3 (button disabled while pending); optional O5 |
| AC-6.3 created session visible, `scheduled` | 2, 4 | **M**, B3 |
| AC-6.4 filter reset if hidden | 4 | Review only (it can't occur with the current statuses) |
| AC-6.5 form closes and resets | 4 | **M**, B3 |
| AC-7.1–7.4 create failure | 4 | Review; optional O1 |
| AC-8.1 behavior-level test exists | 5 | **M** |
| AC-8.2 passes via command | 1, 5 | `npm run test` exit code 0 |
| AC-9.1 starts via command | 5 | `npm run dev` |
| AC-9.2 manual flow recorded | — | B1–B3 recorded in `workflow-log.md` |

## 6. Automated tests

**File:** `tests/SessionsWorkspace.test.tsx`

**Conventions:**
- Render `<App />` and use `userEvent.setup()`.
- Query only by role, label or text.
- Set the date with `fireEvent.change(input, { target: { value: '2099-06-01T10:00' } })`. Typing into `datetime-local` is unreliable in jsdom.

### Mandatory: M – loads sessions and creates one

- **Steps:**
  1. Render the app. A loading status is visible.
  2. Wait (`findBy*`) until the seeded titles appear with their status and date.
  3. Click "New session".
  4. Enter the Title `"  Intro to testing  "` and a future date, then click submit.
- **Assertions:**
  - "Intro to testing" (trimmed) appears as the **last** list item, with status `scheduled`;
  - the form is gone.
- This covers FR-1, FR-4, FR-6 and FR-8. It is the main flow named in TASK.md.

### Optional, by priority

Add these only while time remains.

1. **O1 – Create failure (FR-7).**
   - `server.use(http.post('/api/sessions', () => new HttpResponse(null, { status: 500 }), { once: true }))`.
   - After submitting, the alert is shown, the inputs keep their values, and submit is enabled.
   - Resubmitting succeeds.
   - Why first: the risk of losing user input is the most damaging untested regression.
2. **O2 – List error and Retry (FR-2).** Use a `once` 500 override on GET. The alert and Retry button appear; clicking Retry shows the list.
3. **O3 – Filter (FR-3).**
   - `Scheduled` hides the `completed` titles, and `All` restores them.
   - Variant: override GET to return only `completed` sessions, then expect "No scheduled sessions."
4. **O4 – Validation bounds (FR-5).**
   - Rejected: `"  ab  "`, 81 characters, and a past date. Each shows a message and the list is unchanged.
   - Accepted: titles of exactly 3 and 80 characters.
5. **O5 – Duplicate guard (AC-6.2).**
   - Use a POST override that counts calls and waits on a promise the test controls.
   - A double click results in one call and one new item.

**Command:** `npm run test` (runs `vitest run`; the expected exit code is 0).

## 7. Commands and manual browser check

| Purpose | Command | Source |
| --- | --- | --- |
| Install (step 1) | `npm install -D vitest@^5 jsdom @testing-library/react@^16 @testing-library/dom @testing-library/user-event@^14 msw@^2` then `npx msw init public --save` | New (approved under Q5) |
| Tests | `npm run test` | New script |
| Lint | `npm run lint` | Existing |
| Type-check and build | `npm run build` | Existing |
| Dev server | `npm run dev` | Existing. Use the URL Vite prints. |

**Manual check.** Use `npm run dev` and record what you actually see in `workflow-log.md`.

- **B1:** open the URL. A loading message shows briefly, then the seeded list with title, status and date/time, in seed order.
- **B2:** choose `Scheduled`. Only `scheduled` sessions remain. Choose `All` and every session returns.
- **B3:** click "New session".
  - Submit a too-short title and a past date: the messages appear and nothing is added.
  - Submit a valid title and a future date: the button is disabled briefly, the form closes, and the session appears last with status `scheduled`.
- **B4:** open `<url>?mock=list-error`.
  - The error message and Retry button appear.
  - Wait about 2 seconds, then click Retry: loading appears, then the list.

A production build/preview does not start MSW, so it has no API. Use `npm run dev` for the manual check.

## 8. Risks, assumptions, open questions, excluded scope

### Risks

- **R1 – Test files are not type-checked by `npm run build`.**
  - Type errors in `tests/` would not fail the build.
  - Vitest transpiles them; a broken import fails the test run instead.
  - This is accepted, because it keeps the tsconfig files unchanged.
- **R2 – The B4 time window is timing-based.**
  - If Retry is clicked within about 2 seconds of loading, it fails again; wait and click again.
  - The window applies only in development, and only when `?mock=list-error` is present.
- **R3 – `datetime-local` varies by browser.** "Future" is checked in the browser's local time (A3). Tests set the value directly.
- **R4 – StrictMode in development.** It sends the first load twice. This is expected, and it is harmless with the `ignore` flag.
- **R5 – Package versions are not pinned.** The coder records the installed versions from `package.json` in the handoff.

### Assumptions

These are carried over from the requirements:
- A1: a single trainer.
- A2: the workspace replaces the starter screen.
- A3: local time zone.
- A4: the in-memory mock resets on reload.
- A5: English only.

### Open questions

None. Nothing blocks implementation.

### Excluded scope

- Everything listed as out of scope in `requirements.md`.
- Also:
  - `jest-dom`;
  - routing;
  - state or data-fetching libraries;
  - styling frameworks;
  - E2E automation;
  - coverage thresholds;
  - CI;
  - strict mode;
  - a create-error URL switch;
  - configurable mock latency;
  - deleting the starter assets;
  - `index.css` edits.

## Revision notes (revision 1 → revision 2)

- **Tests:**
  - One mandatory test (M: load and create) instead of two essential tests plus six recommended ones.
  - The rest are optional tests O1–O5, ordered by risk.
- **Manual error mechanism (Q7):**
  - The persistent `?mock=list-error` handler is replaced with a 2-second failure window, so B4 now shows recovery after Retry.
  - `?mock=create-error` is removed.
- **TypeScript build:**
  - Tests and setup move to `tests/`, and Vitest config moves to `vitest.config.ts`.
  - `tsc -b` no longer sees test code, so no tsconfig change is needed, which resolves the old R1.
  - `vite.config.ts` is now untouched.
- **MSW and boundary simplified:**
  - Removed: the handler factory with a latency option, and the exported error-handler helpers. Tests inline their `once` overrides, and MSW's default `delay()` is used.
  - The response type guard is reduced to a minimal shape check.
- **Node readiness:** Doctor confirmed Node.js 24.21.0 (PASS). The old R2 version check is removed.
