# Requirements: Training Sessions Workspace

Task ID: `training-sessions-workspace`

Sources: `frontend-accelerator-onboarding/TASK.md`, `frontend-accelerator-onboarding/README.md`, `frontend-accelerator-onboarding/PASS_CRITERIA.md`, a limited inspection of the repository (see "Observed repository constraints"), and the developer decisions recorded under "Developer decisions".

## Goal

A trainer can open a small frontend workspace and:
- see the training sessions loaded from a mock API;
- filter them by one status;
- create a new session with a title and a future date/time;
- see the new session in the list.

The scope is kept small on purpose. The exercise exists to practise the accelerator workflow, not to build a production application.

## In scope

Mandatory (from TASK.md):

1. A sessions list loaded from a mock API, showing each session's title, status and start date/time.
2. A filter with an `All` option and one status option (`scheduled`).
3. A loading state while the list request is pending.
4. One understandable, recoverable error state when the list request fails.
5. A create form, opened from the workspace, with title and start date/time inputs.
6. Validation:
   - the trimmed title must be 3–80 characters;
   - the date/time must be in the future;
   - failed validation shows a useful message.
7. Duplicate submission is prevented while the create request is pending.
8. A successfully created session appears in the visible list.
9. Mock data sits behind an HTTP client or an equivalent replaceable request boundary. No backend service.
10. At least one passing behavior-level automated test covering the main flow (filtering or successful creation).
11. One manual browser run of the list → filter → create flow, with the real observation recorded. This is a workflow obligation, not application behavior.

Added by developer decision (Q6), within the create flow:

12. When the create request fails, an understandable error message is shown and the form values are kept.

## Out of scope

Explicitly optional in TASK.md, so not part of this task:
- session details, drawers or deep links;
- search or multiple filters;
- pagination;
- a complete API contract or scenario matrix;
- desktop/mobile screenshot sets;
- exhaustive responsive and accessibility validation;
- full test coverage;
- CI, deployment or a public URL;
- strict TypeScript migration or unrelated refactoring.

Also excluded:
- editing or deleting sessions;
- changing a session's status (for example marking it `completed`);
- a `completed` filter option;
- client-side sorting of the list;
- a backend service;
- persisting mock data across page reloads (not required by TASK.md);
- anything from `frontend-accelerator-assessment/`.

## Developer decisions

| # | Decision | Status |
| --- | --- | --- |
| Q1 | The statuses are `scheduled` and `completed`. The filter options are `All` and `scheduled`. | Confirmed |
| Q2 | New sessions get the `scheduled` status, assigned by the mock API. | Confirmed |
| Q3 | Form presentation (inline or dialog) and its behavior after a successful submit (close or reset). | **Deferred to planning** |
| Q4 | After a successful create, reset the filter to `All` if the new session doesn't match the active filter. | Confirmed |
| Q5 | Testing and mocking tools: pick minimal ones during planning. Adding the needed devDependencies is approved. | **Deferred to planning** (approval given) |
| Q6 | If the create request fails, show an understandable error message and keep the form values. | Confirmed |
| Q7 | A simple, reproducible scenario for the list error. | **Deferred to planning** |
| Q8 | Show sessions in the order the API returns them, with no extra sorting. | Confirmed |

## Functional requirements with acceptance criteria

### FR-1 Load and display sessions

- **AC-1.1** Opening the workspace starts a request for sessions through the replaceable request boundary.
- **AC-1.2** While that request is pending, a loading indicator is visible and the list is not shown as empty.
- **AC-1.3** When the request succeeds, every returned session shows its title, its status (`scheduled` or `completed`) and its start date/time.
- **AC-1.4** Sessions appear in the order the API returns them. The client does no extra sorting (Q8).
- **AC-1.5** No session data is hard-coded in the UI layer. Replacing the mock with a real endpoint should only require changing the request boundary.
- **AC-1.6** The mock data includes at least one `scheduled` and one `completed` session, so the filter's effect can be seen.

### FR-2 Request-error state (list)

- **AC-2.1** When the list request fails, an understandable error message is shown instead of the list.
- **AC-2.2** The error state offers a recovery action, for example a retry that re-issues the request. A successful retry shows the list.
- **AC-2.3** The error state can be triggered on purpose, in a simple and reproducible way, for automated tests and the manual check. **The mechanism is deferred to planning (Q7).**

### FR-3 Filter by status

- **AC-3.1** The filter offers exactly two options: `All` and `scheduled` (Q1).
- **AC-3.2** `All` is selected by default and shows every loaded session, whether `scheduled` or `completed`.
- **AC-3.3** Selecting `scheduled` shows only sessions with status `scheduled` and hides the `completed` ones. Selecting `All` again shows every session.
- **AC-3.4** When no session matches `scheduled`, the user can tell the list is empty for that filter rather than still loading.

### FR-4 Open the create form

- **AC-4.1** The workspace has a visible control that opens a create form.
- **AC-4.2** The form has a title input and a start date/time input, each with an accessible label.
- **AC-4.3** Whether the form is inline or a dialog is **deferred to planning (Q3)**.

### FR-5 Validate input

- **AC-5.1** Leading and trailing whitespace is ignored when checking the title. A trimmed title shorter than 3 or longer than 80 characters is rejected.
- **AC-5.2** A title that is exactly 3 or exactly 80 characters after trimming is accepted.
- **AC-5.3** A missing date/time, or one that is not later than the current time at submission, is rejected.
- **AC-5.4** Each rejection shows a message that says what is wrong, for example the title length range or "must be in the future". No create request is sent while validation fails.

### FR-6 Submit and prevent duplicates

- **AC-6.1** Submitting valid input sends one create request through the request boundary, with the trimmed title and the chosen date/time. The client does not send a status.
- **AC-6.2** While that request is pending, further submissions are blocked (for example, the submit control is disabled). Repeated clicks or Enter presses produce no extra requests.
- **AC-6.3** On success, the mock API returns the created session with status `scheduled` (Q2). It appears in the visible list with its title, status and start date/time, without a page reload.
- **AC-6.4** After a successful create, if the active filter would hide the new session, the filter resets to `All` (Q4). With the confirmed statuses and filter options, a new `scheduled` session always matches both `All` and `scheduled`, so this reset should not happen under the current decisions. The rule is kept as the stated guarantee.
- **AC-6.5** What the form does after success (closes, or resets its fields) is **deferred to planning (Q3)**.

### FR-7 Create-request failure (Q6)

- **AC-7.1** When the create request fails, an understandable error message is shown.
- **AC-7.2** The title and date/time values the user entered are kept, so they can resubmit without retyping.
- **AC-7.3** After the failure, the user can submit again (the duplicate-submit guard is released).
- **AC-7.4** A failed create adds nothing to the list.

### FR-8 Behavior-level automated test

- **AC-8.1** At least one automated test drives the UI as a user would (render, interact, assert on visible output) for filtering or successful creation.
- **AC-8.2** The test passes using a documented repository command. No test tooling exists yet, so **the choice of minimal test and mock tools is deferred to planning (Q5)**. Adding the needed devDependencies is approved.

### FR-9 Run the app and check it manually

- **AC-9.1** The app starts with a documented repository command. `npm run dev` exists today.
- **AC-9.2** The list → filter → create flow is exercised once in a browser, and what was actually observed is recorded in the workflow log.

## Observed repository constraints

These were verified by reading the files listed with each item.

- **Framework:** React `^19.2.8` and React DOM, built with Vite `^8.3.0` and `@vitejs/plugin-react` (`package.json`, `vite.config.ts`). TypeScript is `~6.0.2`.
- **Package manager:** npm. `package-lock.json` is present; no `yarn.lock` or `pnpm-lock.yaml` was found.
- **Scripts:** `dev` (`vite`), `build` (`tsc -b && vite build`), `lint` (`oxlint`) and `preview` (`vite preview`). There is **no `test` script**.
- **Testing setup:** **none found.** There is no Vitest, Jest, Testing Library or Playwright dependency, no test config file, and no `*.test.*` or `*.spec.*` files.
- **API mocking:** **none found.** There is no MSW or other mock dependency, no `mockServiceWorker.js` in `public/`, and no `fetch`, `axios`, `msw` or `mock` usage in `src/`.
- **Application code:** `src/App.tsx` contains only the default Vite/React starter screen (counter and links). There is no routing library and no existing data layer.
- **TypeScript config:** `tsconfig.app.json` sets `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly` and `verbatimModuleSyntax`. `strict` is not set. Strict adoption is out of scope.
- **Application root:** the repository root is the only frontend application found.

## Assumptions

These have not been confirmed by the developer.

- **A1.** One trainer only. There are no permissions, authentication or multi-user concerns.
- **A2.** The workspace can replace the starter content in `src/App.tsx` as the app's single screen. TASK.md does not require routing.
- **A3.** Date/times are entered and shown in the browser's local time zone. "In the future" is checked against the client's current time when the form is submitted.
- **A4.** Mock data only needs to last for the current page session. Created sessions may disappear on reload.
- **A5.** UI text is English only. No localization is needed.

## Open questions

All product questions are resolved. The remaining items are implementation decisions deferred to `writing-plans`:

- **Q3 (deferred).** Is the form inline or a dialog, and after success does it close or reset its fields?
- **Q5 (deferred).** Which minimal test runner, UI-testing utilities and HTTP mock tool to use, plus a `test` script. Adding devDependencies is approved.
- **Q7 (deferred).** A simple, reproducible way to trigger the list-error scenario for tests and the manual check.
- **Q9 (planning detail, new).** Where a newly created session appears in the list (for example appended or prepended). Q8 covers only the order of the loaded list, and no product requirement constrains this position.

## Readiness

Ready for `writing-plans`. Every product decision is confirmed. The deferred items Q3, Q5, Q7 and Q9 are implementation choices the plan must resolve explicitly.
