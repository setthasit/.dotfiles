# Write-Time Prompt Templates

Prompts for the SCOUT, CODE, and VERIFY spawns. Which agent runs each: the **Role → agent** table in `SKILL.md`. Fill every bracket. An empty bracket means the plan block was not forwarded.

- The subagent inherits **nothing**. Anything it needs and cannot find from a pointer goes in the prompt
- Pass **pointers, not payloads**: the plan's `Read first` lines, symbol names, "follow the pattern in X". Paste code only when ≤10 lines and decisive

## SCOUT - context brief (unfamiliar areas, missing pointers)

```
Read-only investigation. Do not modify anything.

Goal: I am about to implement [task description] in this repo.

Find and report:
1. Files and symbols involved: path:line for each
2. Key signatures/types I must match
3. The nearest existing example of this pattern: path:line
4. Test style used for this area: framework, file naming, mocking approach
5. Gotchas: shared state, generated code, migrations, anything that breaks if changed

Constraints:
- Pointers and one-line notes only. Do NOT paste file contents
- If something does not exist, say so explicitly. Do not infer it
- Max 25 lines
```

## CODE - writer prompt

```
## Task [ID]: [task name]

### Part brief
Read [part brief path] first. It holds the Goal, the project rules, the rubric path, the test commands, and the run rules for every task in this part.

### Task block (verbatim from plan)
Serves: [scenario IDs]
Files: [modify/create/test paths]
Blocked by: [leaf task IDs already [x], or none]
Read first: [path:line (what to copy)]; [path:line (contract to honour)]
Change: [concrete identifiers, signatures, expected outputs]
Done when: [observable checks]

### Scenarios served (verbatim from requirements.md)
[Each R/S block this task serves. Paraphrasing silently drops constraints.]

### Must not break
[Existing callers, public API, persisted data shape, contracts, migrations]

### Do not touch
[Paths outside Files]

### Acceptance
Read the rubric the part brief names. Mandatory Acceptance criteria: [verbatim]. Apply standards while writing. Review may accept low-impact findings. Do not perform speculative cleanup to seek a perfect score.

### Definition of done
The plan gives pointers and shapes, not code to paste. Read the files in Read first and the real conventions, then choose the implementation that fits the repo and meets Done when. Deviate when the repo demands it, and say so in the report.
Every line under Done when holds, verified by you. Stop there, even if you see more to do. Report it instead. Cannot reach Done when inside Files → stop and report. Do not widen the task.

### Rules
- Implement ONLY this task. No extra features, no drive-by refactors
- Add or update tests covering the scenarios served, asserting real values
- Run only the tests related to your change before reporting: the test files in Files, plus the tests that load a file you changed. [related-test command from the part brief, or "Find them by searching the test folder for each changed file's path or exported name"]. The full suite runs later in batch verification. Run it yourself only when no related test can be found, and say so
- Every command that starts the app, a server, a game, or any long job runs under a time limit, such as `timeout <seconds>`. A run that hits the limit is a failure to report, never a reason to run it again without one
- A driver, smoke, or soak script: look in the repo's tools and in [plan dir]/scripts/ first. A script later tasks or phases will run again belongs in the repo, and only when Files names it. A one-off goes in [plan dir]/scripts/ and is named in your report
- UI, mobile, TUI, or CLI change → leave it runnable and name in your report the exact command, route, screen, or flag needed to reach it. A Tester spawn operates it and a Design review spawn judges how it looks. You certify neither yourself
- A visual change → use the repo's existing components and design tokens, never a hand-rolled colour, spacing, radius, or shadow, and handle the loading, empty, and error states the scenarios state
- Do NOT commit. Leave changes unstaged. Do NOT edit any file in the plan directory, apart from your report file and [plan dir]/scripts/
- Do NOT mention the plan anywhere you write: no plan filename, task ID, phase number, or requirement ID in code, comments, tests, config, or docs

### Previous review feedback (retry only)
[Selected findings verbatim under their axis headings, with IDs and levels. Address only these.]

### Accepted as-is (retry only)
[Unselected findings and recorded reasons. Preserve these as context. Do not fix them automatically.]

### Report
Write the full report to [plan dir]/reports/[phase]-[ID]-writer.md:
- Done when: each line → holds / does not hold, with the exact command run and the output line that proves it
- Files changed, one line each with the reason
- Tests added/updated (names only)
- Verification: each command run, pass/fail, failing test names only (no full output)
- Deviations from the plan, and why
- Anything you could not verify

Then return at most 10 lines:
- Report: [the file path]
- Done when: one line per line → holds / does not hold, the command, and the output line that proves it
- Tests run: the related-test command, pass/fail with counts
- Deviations: none, or one line each
- Not verified: none, or one line each
```

## VERIFY - batch verifier

```
Verification only. Do not judge the diff. Do not edit, stage, or commit any file.

Tasks under check: [task IDs]. Their changes are [uncommitted in this worktree | committed in range <base>..<head>].
Files per task, one line each:
[task ID]: [Files paths]

Run each command once, from [working directory]:
1. [test cmd: the full suite for a writer batch. The scope table in `SKILL.md` step 2 decides the commands for a fix round or a docs-only or script-only change]
2. [lint cmd]
3. [build cmd]

Rules:
- Never fix anything. Never re-run a command to get a pass
- A command that cannot run is unavailable. Report its exact error. Do not substitute another command
- Attribute each failing test to the task whose Files hold its path. No such task → `unattributed`

Report back in at most 15 lines, plus one line per failing test:
- First line: `PASS` when every command passed, otherwise `FAIL`, then the test counts as `N passed, M failed`
- Per command: command, working directory, pass / fail / unavailable, and the first error line on a fail
- Per failing test: test name → task ID or `unattributed`
```
