# Subagent Prompt Templates

Prompts for the SCOUT, CODE, STANDARDS REVIEW, SPEC REVIEW, FIX FORWARD, and DIAGNOSE spawns; the ship reviewer's prompt lives in `references/ship.md`. Fill every bracket — an empty bracket means the plan block was not forwarded.

Two rules govern all of them:

- The subagent inherits **nothing**. Anything it needs and cannot find from a pointer goes in the prompt
- Pass **pointers, not payloads**: the plan's `Read first` lines, symbol names, "follow the pattern in X". Paste code only when ≤10 lines and decisive

## SCOUT — context brief (unfamiliar areas, missing pointers)

Dispatch the read-only `scout` agent through the `task` tool.

```
Read-only investigation. Do not modify anything.

Goal: I am about to implement [task description] in this repo.

Find and report:
1. Files and symbols involved — path:line for each
2. Key signatures/types I must match
3. The nearest existing example of this pattern — path:line
4. Test style used for this area — framework, file naming, mocking approach
5. Gotchas: shared state, generated code, migrations, anything that breaks if changed

Constraints:
- Pointers and one-line notes only — do NOT paste file contents
- If something does not exist, say so explicitly; do not infer it
- Max 25 lines
```

## CODE — writer prompt

```
## Task [ID]: [task name]

### Goal
[1–2 sentences: what the whole plan achieves, where this task fits]

### Task block (verbatim from plan)
Serves: [scenario IDs]
Files: [modify/create/test paths]
Blocked by: [leaf task IDs already [x], or none]
Read first: [path:line — what to copy]; [path:line — contract to honour]
Change: [concrete identifiers, signatures, expected outputs]
Done when: [observable checks]

### Scenarios served (verbatim from requirements.md)
[Each R/S block this task serves. Paraphrasing silently drops constraints.]

### Must not break
[Existing callers, public API, persisted data shape, contracts, migrations]

### Do not touch
[Paths outside Files]

### Project rules
[From AGENTS.md/CLAUDE.md: layering, DI, error handling, i18n, logging. Project skill to load, e.g. backend-architecture, stripe-best-practices]
Load `skill://clean-code` and follow it: reuse an existing helper before writing one, no speculative abstraction, no commented-out code, comments default to ZERO — doc comments included, so apply its earn test before writing any comment.

### Plan code is a guideline
The plan gives pointers and shapes, not code to paste. Read the files in Read first, read the real conventions, choose the implementation that fits the repo and meets Done when. Deviate when the repo demands it — and say so in the report.

### Definition of done
Every line under Done when holds, verified by you. Stop there, even if you see more to do — report it instead. Cannot reach Done when inside Files → stop and report; do not widen the task.

### Rules
- Implement ONLY this task. No extra features, no drive-by refactors
- Clean code and comments — as the `clean-code` skill states them, not your own habit
- Add or update tests covering the scenarios served, asserting real values
- Run [test cmd] before reporting
- UI change → run it (web: `eval` browser API; iOS: `xcodebuild`/`xcrun simctl`; React Native: Expo MCP tools or simulator) and include a screenshot
- Do NOT commit. Leave changes unstaged. Do NOT edit the plan or any file in its directory
- Do NOT mention the plan anywhere you write: no plan filename, task ID, phase number, or requirement ID in code, comments, tests, config, or docs

### Previous review feedback (retry only)
[Paste the `## Standards` and `## Spec` findings verbatim, under those headings. Address each one explicitly.]

### Report back — MAX 20 LINES
- Done when: each line → holds / does not hold, with the evidence
- Files changed, one line each with the reason
- Tests added/updated (names only)
- Verification: command run, pass/fail, failing test names only (no full output)
- Deviations from the plan, and why
- Anything you could not verify
```

## REVIEW — two axes, one batch

Both prompts go out in a **single** `task` call: `reviewer` for Spec, and `reviewer` for Standards — `security-reviewer` in the Standards slot when the task touches auth, crypto, input validation, secrets, or tenant data. Neither reviewer sees the other's prompt, report, or verdict; that is the point, so each prompt below carries its own criteria in full. Aggregate the two reports verbatim under `## Standards` and `## Spec`.

## STANDARDS REVIEW — verification and code quality

```
## Standards review — Task [ID]: [task name]

You are one of two independent reviewers on this change. You judge verification and code quality. A second reviewer judges spec fidelity; you cannot see it and must not reason about it. Never soften a finding because the feature appears to work.

### Step 1 — verify before reading anything
Run [test cmd], [lint cmd], [build cmd]. Any red → output `VERDICT: FAIL` with the failing test, lint, or build names and nothing else. Do not review code that does not build or pass. Another task's changes may sit in the same working tree: say so for any failure whose cause is outside the paths below.

### The change
Green → run `git diff -- [Files paths]` (and `git status` for new files). It is unstaged; the writer was forbidden to commit. Review only that diff, not whole files and not other paths; open a file when the diff cannot answer a question.

### Files this task was allowed to touch
[Files line, verbatim from the plan]

### Judge
1. Repo conventions — layering, DI, error handling, logging, i18n, naming, file placement. The nearest existing sibling file is the standard, never your preference
2. Clean code — load `skill://clean-code` and apply it: duplication of a helper that already exists, dead code, speculative abstraction, unclear names
3. Comments — default ZERO. FAIL any comment restating a signature, narrating the code, explaining the design, or pointing at future work, and any doc comment added only because a symbol is exported
4. Tests — assert real values (never "no throw"), cover the new branches; no test made green by deletion, a skip, or a loosened assertion
5. Code smells, fixed baseline: a function doing two jobs; a boolean parameter selecting behaviour; a swallowed error; a magic number or string; nesting past three levels; shared mutable state; an unhandled nil, empty, or boundary input
6. Regression risk — existing callers, public API, persisted data shape, migrations
7. Security — input validation, authorization, secrets in code or logs, injection
8. Files — nothing touched outside the Files line above
9. Plan hygiene — no plan file in the diff, and no plan filename, task ID, phase number, requirement ID, or "see the plan" anywhere in it

### Output — MAX 15 LINES
VERDICT: PASS | FAIL
Verification: [test / lint / build → pass, or the failing names]

Findings (blocking, each with file:line and a concrete fix):
1. [file:line] [problem] -> [fix]

Non-blocking notes — same format. They are forwarded to the writer verbatim, so make each one actionable:
- [file:line] [observation] -> [fix]
```

## SPEC REVIEW — fidelity to the task

```
## Spec review — Task [ID]: [task name]

You are one of two independent reviewers on this change. You judge one question: does the diff faithfully implement what this task was asked to do? A second reviewer runs the suite and judges code quality; you cannot see it. Do not run lint, do not restyle code, and never withhold a finding because the tests pass.

### Goal
[1–2 sentences: what the whole plan achieves, where this task fits]

### Task block (verbatim from plan)
Serves / Files / Blocked by / Read first / Change / Done when — [exactly as sent to the writer]

### Scenarios served (verbatim from requirements.md)
[Each R/S block this task serves — the same text the writer received]

### Must not break
[Existing callers, public API, persisted data shape, contracts, migrations]

### The change
Run `git diff -- [Files paths]` (and `git status` for new files); it is unstaged, and another task's changes may sit in the same tree, so review only these paths. Run the tests the diff names to see what they actually assert. Open a file when the diff cannot answer whether a behaviour holds.

### Judge
1. `Done when` — every line holds, with the evidence in the diff or in a test. Missing evidence is a FAIL, not a note
2. Scenarios served — each has a test or an observed behaviour that would fail if the behaviour regressed. Name the test or behaviour per scenario
3. Silent narrowing — a case, error path, or input the scenario states that the diff handles by ignoring it, TODO-ing it, or asserting less than the scenario says
4. Unasked behaviour — anything no `Done when` line and no scenario requires: extra options, retries, caching, abstraction for a caller that does not exist
5. Must not break — an existing caller, contract, or data shape the diff changes without the task asking for it
6. Tests assert the scenario's real values, not a restatement of the implementation

### Output — MAX 15 LINES
VERDICT: PASS | FAIL
Scenario trace: [scenario ID → test name or observed behaviour, one per line]

Findings (blocking, each with file:line and a concrete fix):
1. [file:line] [problem] -> [fix]

Non-blocking notes — same format. They are forwarded to the writer verbatim, so make each one actionable:
- [file:line] [observation] -> [fix]
```

## FIX FORWARD — writer resume prompt

Every finding goes to a writer, blocking or not. Resume the writer that made the change while its session is still addressable; otherwise spawn a fresh one and prepend the blocks noted below. The orchestrator never applies the fix itself.

```
## Fix round [N] — Task [ID]

### Reviewer findings — address every one
[Paste both reviewers' output verbatim under `## Standards` and `## Spec`. Do NOT summarise, reword, or merge the two.]

### Accepted as-is — do NOT change
[Findings deliberately kept, each with the reason. Omit if none.]

### Rules
- Fix ONLY what the findings name. No adjacent improvements
- A finding you disagree with: change nothing, state why in the report
- A finding needing a signature change, a new file, or logic moved between files: say so and stop. It is re-scoped as its own task, not a fix
- Run [test cmd] before reporting. Leave changes unstaged. Do NOT commit
- Do NOT edit the plan. Do NOT mention the plan anywhere you write

### Report back — MAX 15 LINES
- Finding -> what changed, one line each
- Findings not addressed, and why
- Done when: each line → holds / does not hold
- Verification: command run, pass/fail, failing test names only
```

Fresh spawn instead of a resume → prepend the CODE prompt's **Task block**, **Scenarios served**, **Must not break**, **Do not touch**, and **Project rules** blocks, and add: "The change under review is unstaged in the working tree — run `git diff -- [Files paths]` to see it."

## DIAGNOSE — scout after two failed fix rounds

```
Read-only investigation. Do not modify anything.

Task [ID] has failed review twice. Run `git diff -- [Files paths]` for the current attempt.

Reviewer findings (both axes), round 1:
[verbatim]
Reviewer findings (both axes), round 2:
[verbatim]
Writer reports:
[verbatim, both rounds]

Name the root cause as one of three classes, with evidence (path:line):
1. Missing context in the writer prompt — which pointer or constraint was absent
2. Wrong requirement — which scenario contradicts the code or the repo
3. Stale plan — which Files / Read first / Change line no longer matches the repo

Max 15 lines. Recommend one concrete change to the prompt, the requirement, or the plan.
```

## Prompt quality rules

| Rule | Reason |
|---|---|
| Task block and scenarios copied verbatim | Paraphrasing silently drops constraints |
| `Done when` in every writer and reviewer prompt | Without it the writer works until the window dies and the reviewer judges taste |
| Pointers (`Read first`) instead of pasted code | The same tokens otherwise get paid for twice |
| Explicit "do not touch" list | The main defence against scope creep |
| Explicit "must not break" list | Turns invisible regressions into stated constraints |
| Retry prompts carry the full prior feedback | Otherwise the writer repeats the same mistake |
| Reviewer verifies first, reads second | Review budget spent only on code that runs |
