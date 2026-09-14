# Write-Time Prompt Templates

Prompts for the SCOUT, CODE, FIX FORWARD, and DIAGNOSE spawns. The STANDARDS, SPEC, and TESTER prompts live in `references/review-prompts.md`; the ship reviewer's in `references/ship.md`. Each spawn's agent type comes from the skill's **Role → agent** table. Fill every bracket — an empty bracket means the plan block was not forwarded.

Two rules govern all of them:

- The subagent inherits **nothing**. Anything it needs and cannot find from a pointer goes in the prompt
- Pass **pointers, not payloads**: the plan's `Read first` lines, symbol names, "follow the pattern in X". Paste code only when ≤10 lines and decisive

## SCOUT — context brief (unfamiliar areas, missing pointers)

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
- UI, mobile, TUI, or CLI change → leave it runnable and name in your report the exact command, route, screen, or flag a tester needs to reach it. A Tester spawn operates it; you do not certify it yourself
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

## FIX FORWARD — writer resume prompt

Every finding goes to a writer, blocking or not, from any axis including the Tester. Resume the writer that made the change while its session is still addressable; otherwise spawn a fresh one of the same agent type and prepend the blocks noted below. The orchestrator never applies the fix itself.

```
## Fix round [N] — Task [ID]

### Findings — address every one
[Paste every axis' output verbatim under `## Standards`, `## Spec`, and `## Tester`. Do NOT summarise, reword, or merge them.]

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
