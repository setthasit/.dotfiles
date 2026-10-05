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
Load the `clean-code` skill and follow it: reuse an existing helper before writing one, no speculative abstraction, no commented-out code, comments default to ZERO — doc comments included, so apply its earn test before writing any comment.
Read [resolved shared rubric path]. Mandatory Acceptance criteria: [verbatim]. Apply standards while writing. Review may accept low-impact findings. Do not perform speculative cleanup to seek a perfect score.

### Plan code is a guideline
The plan gives pointers and shapes, not code to paste. Read the files in Read first, read the real conventions, choose the implementation that fits the repo and meets Done when. Deviate when the repo demands it — and say so in the report.

### Definition of done
Every line under Done when holds, verified by you. Stop there, even if you see more to do — report it instead. Cannot reach Done when inside Files → stop and report; do not widen the task.

### Rules
- Implement ONLY this task. No extra features, no drive-by refactors
- Clean code and comments — as the `clean-code` skill states them, not your own habit
- Add or update tests covering the scenarios served, asserting real values
- Run [test cmd] before reporting
- UI, mobile, TUI, or CLI change → leave it runnable and name in your report the exact command, route, screen, or flag needed to reach it. A Tester spawn operates it and a Design review spawn judges how it looks; you certify neither yourself
- A visual change → use the repo's existing components and design tokens, never a hand-rolled colour, spacing, radius, or shadow, and handle the loading, empty, and error states the scenarios state
- Do NOT commit. Leave changes unstaged. Do NOT edit the plan or any file in its directory
- Do NOT mention the plan anywhere you write: no plan filename, task ID, phase number, or requirement ID in code, comments, tests, config, or docs

### Previous review feedback (retry only)
[Selected findings verbatim under their axis headings, with IDs and levels. Address only these.]

### Accepted as-is (retry only)
[Unselected findings and recorded reasons. Preserve these as context. Do not fix them automatically.]

### Report back — MAX 20 LINES
- Done when: each line → holds / does not hold, with the evidence
- Files changed, one line each with the reason
- Tests added/updated (names only)
- Verification: command run, pass/fail, failing test names only (no full output)
- Deviations from the plan, and why
- Anything you could not verify
```

## FIX FORWARD — writer resume prompt

Only selected fixes go to the writer. Resume the original writer or spawn a fresh writer of the same type with the pointer blocks below. The coordinator never fixes code. Passing tasks do not automatically earn a writer round.

```
## Fix round [N] — Task [ID]

### Selected findings
[Paste selected findings verbatim under their Standards, Spec, Tester, or Design review headings. Include all blockers. Preserve IDs and levels.]

### Acceptance
Read [resolved shared rubric path]. Mandatory criteria: [verbatim]. Current decision and deductions: [coordinator result]. Required fix or optional polish: [mode]. Fix selected findings, then stop. Do not pursue 100.

### Accepted as-is — do NOT change
[Findings deliberately kept, each with the reason. Omit if none.]

### Rules
- Fix ONLY what the findings name. No adjacent improvements
- A finding you disagree with: change nothing, state why with evidence. The judge resolves disputes. The writer cannot delete a deduction
- A finding needing a signature change, a new file, or logic moved between files: say so and stop. It is re-scoped as its own task, not a fix
- Run [test cmd] before reporting. Leave changes unstaged. Do NOT commit
- Do NOT edit the plan. Do NOT mention the plan anywhere you write

### Report back — MAX 15 LINES
- Finding ID -> what changed and evidence, one line each
- Findings not addressed, and why
- Done when: each line → holds / does not hold
- Verification: command run, pass/fail, failing test names only
```

Fresh spawn instead of a resume → prepend the CODE prompt's **Task block**, **Scenarios served**, **Must not break**, **Do not touch**, and **Project rules** blocks, and add: "The change under review is uncommitted in the working tree — run `git diff HEAD -- [Files paths]` to see it."

## DIAGNOSE — scout after two failed fix rounds

```
Read-only investigation. Do not modify anything.

Task [ID] has failed review twice. Run `git diff HEAD -- [Files paths]` for the current attempt.

Reviewer findings (both axes), round 1:
[verbatim]
Reviewer findings (both axes), round 2:
[verbatim]
Writer reports:
[verbatim, both rounds]

Compare each finding with the current diff and the writer's reported fix. Read related callers and tests when needed. Do not run tests, reproductions, or state-changing commands.

Classify the supported causes. More than one may apply:
1. Missing context: which pointer or constraint was absent
2. Wrong requirement: which scenario contradicts the code or repo
3. Stale plan: which Files / Read first / Change line no longer matches
4. Implementation defect: which code path remains wrong despite a clear requirement
5. Verification failure: which command, fixture, or environment prevents a reliable check
6. Conflicting feedback: which findings demand incompatible changes
7. Unknown: what evidence is missing

Max 15 lines. Cite path:line or a specific finding or command result for each cause. Separate facts from hypotheses. Recommend the smallest next fix or check and name its owner. Do not invent a requirement change to excuse an implementation defect.
```

## Prompt quality rules

| Rule | Reason |
|---|---|
| Task block and scenarios copied verbatim | Paraphrasing silently drops constraints |
| `Done when` in every writer and reviewer prompt | Without it the writer works until the window dies and the reviewer judges taste |
| Pointers (`Read first`) instead of pasted code | The same tokens otherwise get paid for twice |
| Explicit "do not touch" list | The main defence against scope creep |
| Explicit "must not break" list | Turns invisible regressions into stated constraints |
| Retry prompts carry selected feedback and accepted findings separately | Prevents repeating defects or turning deferred notes back into required work |
| Reviewer verifies first, reads second | Review budget spent only on code that runs |
