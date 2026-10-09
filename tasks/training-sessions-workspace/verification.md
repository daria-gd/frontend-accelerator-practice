# Verification: Training Sessions Workspace

Task ID: `training-sessions-workspace`
Role: `verify`
Run 2, on 2026-10-09. This replaces the run of 2026-10-08. Everything below was observed in this verification session unless it says otherwise.

## 1. Scope and Git state

- **Application root:** the repository root (`C:\tech\accelerator\frontend-accelerator-practice`). It uses npm (`package-lock.json`), React 19, Vite 8 and TypeScript.
- **Dependencies:** `node_modules` is present (`Test-Path node_modules` returned `True`). Nothing was installed or updated.
- **Git:** `git status` showed the branch `main`, and `git log --oneline -3` showed one commit, `0ef5ff7 feat: complete setup and implementation plan`.

```text
Changes not staged for commit:
	modified:   package-lock.json
	modified:   package.json
	modified:   src/App.css
	modified:   src/App.tsx
	modified:   src/main.tsx
	modified:   tasks/training-sessions-workspace/workflow-log.md

Untracked files:
	public/mockServiceWorker.js
	src/mocks/
	src/sessions/
	tasks/training-sessions-workspace/review.md
	tasks/training-sessions-workspace/verification.md
	tests/
	vitest.config.ts
```

Read for this run:

- Task files: `requirements.md`, `implementation-plan.md` (Revision 2), `review.md`, and `workflow-log.md` (the Role Decisions table and the Manual Browser Observation section).
- Onboarding files: `TASK.md`, `README.md`, `PASS_CRITERIA.md`.
- Code: `tests/SessionsWorkspace.test.tsx`, `src/sessions/*`, `src/mocks/handlers.ts`, `src/main.tsx`.
  - The source files were already read in run 1. `git status` shows no change since then, apart from the test file.

`frontend-accelerator-assessment/` was not used.

## 2. Commands run

| # | Command | Exit code | Result |
| --- | --- | --- | --- |
| 1 | `git status`, `git log --oneline -3` | 0 | The state shown in section 1. |
| 2 | `npm run test` (`vitest run`) | **0** | Vitest v5.0.3: 1 test file passed, **4 of 4 tests passed**, in 2.48 s. No failures and no warnings. |
| 3 | `npx vitest run --reporter=verbose` | **0** | The same suite, run only to list the test names (section 3). 4 of 4 passed, in 2.50 s. |
| 4 | `npm run lint` (`oxlint`) | **0** | No output, so no errors or warnings. |
| 5 | `npm run build` (`tsc -b && vite build`) | **0** | `tsc -b` passed. `vite v8.3.3` transformed 21 modules and wrote `dist/index.html` (0.47 kB), `dist/assets/index-DpQO5vSm.css` (3.36 kB) and `dist/assets/index-BFUhToS-.js` (224.12 kB, 70.11 kB gzip). Built in 130 ms. No warnings. |
| 6 | `npm run dev`, started and then stopped | n/a (stopped on purpose) | `VITE v8.3.3 ready in 273 ms` with `Local: http://localhost:5174/`. It printed `Port 5173 is in use, trying another one...`, so another process was already using port 5173. Vite also printed `Re-optimizing dependencies because vite config has changed`. The process tree was then stopped, and a check confirmed the process had ended. No browser was opened. |

## 3. Automated test results

From command 3 (`tests/SessionsWorkspace.test.tsx`):

| Test | Result |
| --- | --- |
| `loads sessions and creates a new one that appears at the end of the list` (mandatory; called **T-Main** below) | Passed (637 ms) |
| `keeps form values and allows resubmitting when creating fails` (**T-CreateFail**) | Passed (401 ms) |
| `shows a recoverable error when loading sessions fails` (**T-ListError**) | Passed (79 ms) |
| `filters sessions by scheduled status and restores all` (**T-Filter**) | Passed (159 ms) |

## 4. Acceptance criteria

"Manual" means the developer's browser observation recorded in `workflow-log.md`, in the "Manual Browser Observation" section, lines 32–35. Its details:

- **Command:** `npm run dev`; the URL was not recorded.
- **Observed:**
  - colour mode follows the browser setting, dark in one browser and light in the other;
  - the list and the form are responsive;
  - filtering works;
  - a date in the past is rejected;
  - a created session is added to the list;
  - after a page reload the created session is gone.
- **Not observed:** the loading state, title-length validation, and the `?mock=list-error` → Retry scenario.

"Code inspection only" means that I read the cited lines and no test or manual run exercised the behavior.

| AC | Status | Evidence source |
| --- | --- | --- |
| AC-1.1 | Verified | T-Main renders the seeded list from MSW through the client. Code: `SessionsWorkspace.tsx:21-35`, `sessionsClient.ts:19-28`. Manual: the list is shown. |
| AC-1.2 | Verified | T-Main asserts the status "Loading sessions…" before the data arrives (`tests/SessionsWorkspace.test.tsx:12`). Code: the list renders only when the state is `ready` (`SessionsWorkspace.tsx:78`, `:89`). |
| AC-1.3 | Verified | T-Main checks each title (`test:22-25`), the `completed` status (`:26`), and the formatted date text with its `datetime` attribute equal to the seeded ISO value (`:28-34`). |
| AC-1.4 | Verified | T-Main asserts that the item count and each title follow seed order (`test:22-25`). Code: no sorting (`SessionsWorkspace.tsx:48-49`). |
| AC-1.5 | Verified | Code inspection (run 1, files unchanged): `fetch` appears only in `sessionsClient.ts:20` and `:31`. The only reference to `src/mocks` is in the DEV-only block of `main.tsx:9-12`. Seed data is in `handlers.ts:4-9`. |
| AC-1.6 | Verified | Code: `handlers.ts:4-9` has 2 `scheduled` and 2 `completed` sessions. T-Filter depends on both. |
| AC-2.1 | Verified | T-ListError: an alert containing "Couldn't load sessions". |
| AC-2.2 | Verified | T-ListError: Retry brings back the list, and the alert is gone. |
| AC-2.3 | Verified | T-ListError uses a reproducible `{ once: true }` 500 override. The manual trigger `?mock=list-error` exists in code (`main.tsx:14-21`) but was **not exercised** in a browser (see section 7). |
| AC-3.1 | Verified | T-Filter: the options are exactly `['All', 'Scheduled']`. |
| AC-3.2 | Verified | T-Filter: the default value is `all`. |
| AC-3.3 | Verified | T-Filter, plus manual ("filtering works"). |
| AC-3.4 | Verified (code inspection only) | `SessionsWorkspace.tsx:89-91`. |
| AC-4.1 | Verified | T-Main clicks "New Session". Manual: a session was created through the form. |
| AC-4.2 | Verified | T-Main finds the inputs by the labels "Title" and "Start date and time". |
| AC-4.3 | Verified | Code: an inline form (`SessionsWorkspace.tsx:74-76`). Manual: the create form was used and is responsive. |
| AC-5.1 | Verified | T-Main types `"  Intro to testing  "` and asserts the exact raw `textContent` `'Intro to testing'` (`test:37`, `:45`). Code: `CreateSessionForm.tsx:12-13`, `:47`. |
| AC-5.2 | Verified (code inspection only) | `CreateSessionForm.tsx:13`: the bounds are inclusive (`< 3 \|\| > 80`). |
| AC-5.3 | Verified | Manual: a date in the past is rejected. Code: `CreateSessionForm.tsx:16-18`. |
| AC-5.4 | Verified (code inspection only) | `CreateSessionForm.tsx:14`, `:18`, `:42`, `:71-75`, `:90-94`. Manual confirms that a past date is rejected, but does not say whether a message was shown or whether a request was sent. |
| AC-6.1 | Verified | T-Main: one submit adds exactly one item with the trimmed title (`test:41-48`). Code: `CreateSessionForm.tsx:46-49` and `sessionsClient.ts:30-35` send no status. |
| AC-6.2 | Verified (code inspection only) | `CreateSessionForm.tsx:37`, `:44`, `:104`, `:107`. No test covers it. |
| AC-6.3 | Verified | T-Main: the new item is last, with status `scheduled` (`test:46-49`). Manual: the created session is added to the list. |
| AC-6.4 | Verified (code inspection only) | `SessionsWorkspace.tsx:44`. This cannot happen with the current statuses. |
| AC-6.5 | Verified | T-Main asserts that the form is gone (`test:50`). The fields reset because the form unmounts (`SessionsWorkspace.tsx:45`, `:74-76`). |
| AC-7.1 | Verified | T-CreateFail: an alert containing "Couldn't create the session". |
| AC-7.2 | Verified | T-CreateFail: the title and date values are kept. |
| AC-7.3 | Verified | T-CreateFail: submit is enabled, and resubmitting succeeds. |
| AC-7.4 | Verified | T-CreateFail: no item is added after the failure. |
| AC-8.1 | Verified | 4 behavior-level tests render `<App />` and drive it through `userEvent`. |
| AC-8.2 | Verified | `npm run test` exited 0, with 4 of 4 tests passed (command 2). |
| AC-9.1 | Verified | `npm run dev` started and served `http://localhost:5174/` (command 6). |
| AC-9.2 | Verified | Manual observation, `workflow-log.md:32-35`: list → filter → create was exercised in a browser, and the results were recorded. The URL was not recorded. The items it does not cover are listed in section 7. |

**Totals (33 acceptance criteria):** **33 Verified**, 5 of them by code inspection only (AC-3.4, AC-5.2, AC-5.4, AC-6.2, AC-6.4). **0 Failed. 0 Not verified.**

## 5. Review findings status

The decision source is `workflow-log.md:24`, the `code-reviewer` row's Developer decision cell:

> "Accept the review (Approved). Fix M-1, L-1 and L-2 (test-only, in `tests/SessionsWorkspace.test.tsx`) using the suggested fixes in `review.md`. Accept L-3, L-4, L-5, L-6 and L-7 as known limitations; do not address them."

| Finding | Status | Evidence |
| --- | --- | --- |
| M-1: the mandatory test doesn't prove trimming | **Fixed** | `tests/SessionsWorkspace.test.tsx:45` asserts `created.textContent` is exactly `'Intro to testing'`, and the test passes. |
| L-1: weak date assertion | **Fixed** | `test:28-34`: `getByText` fails if the formatted date is missing, and the `datetime` attribute must equal `'2020-03-10T09:00:00.000Z'`. |
| L-2: class and element selectors in the test | **Fixed** | `test:22-25` and `:33` use `within(...).getByText`. There is no `querySelector` left in lines 1–55. |
| L-3: a create is possible while the list isn't ready | Open, accepted by developer decision | `workflow-log.md:24`. |
| L-4: blank page if the mock worker fails to start | Open, accepted by developer decision | `workflow-log.md:24`. |
| L-5: validation errors are not announced or focused | Open, accepted by developer decision | `workflow-log.md:24`. |
| L-6: duplicate guard reads state from the render closure | Open, accepted by developer decision | `workflow-log.md:24`. |
| L-7: copy wording, and the `package.json` trailing newline | Open, accepted by developer decision | `workflow-log.md:24`. |

## 6. Failures

None. Every command exited 0, and no test failed.

## 7. Unverified items

These items do not block AC-9.2, but nothing exercised them in a browser:

- **The manual `?mock=list-error` → Retry scenario.** The workflow log lists it as not recorded. Recovery is proven only by T-ListError in jsdom.
  - To check it, open `<url>?mock=list-error`, wait about 2 seconds, click Retry, and confirm that the list appears.
- **The loading state in a browser.** It is not recorded manually. T-Main covers it in jsdom.
- **Title-length validation and its messages (AC-5.2, AC-5.4).** These are code inspection only, with no test or manual check.
- **The duplicate-submit guard (AC-6.2), the empty-filter message (AC-3.4) and the filter reset after a create (AC-6.4).** These are code inspection only.
- **The manual-run URL.** It was not recorded; the observation says "URL not recorded".
- **Production preview.** Not checked. `npm run preview` has no mock API, as the plan notes.
- **The L-7 trailing newline in `package.json`.** Not checked. It is accepted anyway.

## 8. Overall result

**Ready for submission.**

- **Checks:** `npm run test` (4/4), `npm run lint` and `npm run build` all exit 0, and the dev server starts.
- **Acceptance criteria:** all 33 are Verified, through tests, code inspection or the recorded manual observation.
- **Review findings:** M-1, L-1 and L-2 are fixed, and L-3 to L-7 are accepted by a recorded developer decision.
- **Manual observation:** a real browser observation of list → filter → create is recorded.

**Non-blocking items in `workflow-log.md`.** These are workflow housekeeping, not code. Complete them before submitting:

- Several rows have an empty "Developer decision" cell:
  - the second `requirements-analyst` row;
  - the second `writing-plans` row;
  - the first `coder` row;
  - the first `verify` row;
  - the latest `coder` row.
- "Active work started" and the whole Completion section ("Active work finished", "Known limitations") still contain template placeholders. L-3 to L-7 and the unverified items in section 7 would fit under "Known limitations".
- This verification run (run 2) has no row in the Role Decisions table yet.
