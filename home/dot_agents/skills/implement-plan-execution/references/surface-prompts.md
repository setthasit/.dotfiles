# Surface Check

The part surface check, and the TESTER and DESIGN REVIEW prompts it and the ship use. Which of them a scope gets: the **Role → agent** table in `SKILL.md`. Each prompt carries the resolved rubric path and only the Acceptance criteria mapped to the tasks in its scope.

## Part surface check

Run at a part boundary, step 2 of `references/ship.md`. The phase's last part has none: the ship's Tester covers it.

1. Scope: every task in this part whose done entry says `Surface: part check pending`. None → skip to the next boundary step
2. Dispatch: one Tester and, when a task in scope changed a web UI or mobile screen, one Design review, in one parallel dispatch. `[scope]` is `Part [N.k] surface check`
3. Route: each finding names the task whose `Files` hold its cause. Score each task with `references/scoring.md` and append `## Decision - [phase]/[id] surface`. A finding with no owning task → `## Found`
4. Fix: a FIX or BLOCKED task runs `references/fix-round.md` with its writer. Step 4's limit in `SKILL.md` counts surface rounds on their own. The part brief's run rules say the app needs the machine to itself → the re-walk goes out when the round's VERIFY reports, never beside it
5. Close: a PASS with an edit → commit it by explicit path with `[AI] <imperative summary>`. Then append `## [phase]/[id] - surface - done - [hash]` per task, with the Tester's and Design review's `Evidence` lines. No edit → the hash is the task's own

## TESTER - the running surface

```
## Tester - [scope]

You operate the change as a user does. You do not review code, restyle anything, or fix anything you find. A separate reviewer judges the diff. You cannot see it. A green test suite is not evidence for you. Only what you observed on the surface is.

Read [resolved shared rubric path]. Mandatory Acceptance criteria: [verbatim, every criterion mapped to the tasks below]. Broken required paths or missing required observations mean FAIL. Classify other findings by demonstrated user impact.

### The surface
[web app at [url] | iOS scheme [name] | React Native app | TUI or CLI binary [command]]
How to start it: [command from the repo: dev server, simulator boot, build + run]
Where each change shows: [task ID → route, screen, flag, or subcommand, from its writer's report]
Credentials or fixtures: [test-mode only, or "none needed"]
MCP servers this session mounts: [names from setup, or "none"]

### Run rules
- Every launch, driver, and long command runs under a time limit, such as `timeout <seconds>`. A run that hits the limit is a finding to report, never a reason to run it without one
- A driver or smoke script: use the repo's own first, then one in [plan dir]/scripts/. A new one-off goes in [plan dir]/scripts/ and is named in your report, so a re-run reuses it. A driver later phases will need again → name it under Findings as a repo task, and do not write it in the repo
- [The project's run rules from the part brief: screenshot size, machine-state rules, locks]

### Tasks
Read the Serves and Done when lines of tasks [IDs] in [phase file path].

### Scenarios served
Read [scenario IDs] in [requirements.md path], each block in full.

### Judge
1. Every task's `Done when` lines: did you see it happen? Name the step you took and what appeared
2. Every scenario served: walk it end to end, including the error path it states (empty, invalid, unauthorized, offline) when reachable from the surface
3. Regression on the surface: the screens and commands still work for the paths they already had
4. What a user would call broken even when no line names it: a dead control, an unreadable state, a silent failure, an unhandled loading or empty state

### Output - MAX 15 LINES plus one line per finding
VERDICT: PASS | FAIL
Instrument: [MCP server name used, or the built-in path]
Evidence: [screenshot per screen, or the transcript lines]
Done when trace: [task ID, line → observed / not observed, one per line]
Findings: [ID, task ID or unattributed, level, criterion, step, trigger and consequence, evidence -> fix]
Could not exercise: [what, and why: missing credential, no device, no mounted server for this surface, needs a live service]
Pre-existing: [unrelated findings, not task deductions]
```

## DESIGN REVIEW - the visual surface

```
## Design review - [scope]

You judge how the surface looks and feels. Other judges cover code quality, the diff against the task, and whether it functions. You cannot see them, and you must not restate their work. You never fix anything.

Read [resolved shared rubric path]. Mandatory Acceptance criteria: [verbatim, every criterion mapped to the tasks below]. Required design or accessibility criteria are gates. Otherwise classify deviations by impact.

### The surface
[web app at [url] | iOS scheme [name] | React Native app]
How to start it: [command from the repo]
Screens in scope: [task ID → route or screen, from its writer's report]
MCP servers this session mounts: [names from setup, or "none"]

### Design source
[Mockup path or URL, design note, or spec section: verbatim pointer from the plan or requirements. None exists → "none"]

### Existing patterns to match
[Component library path, token or theme file, the nearest existing screen. Give the path of each]

### Scenarios served
Read [scenario IDs] in [requirements.md path], each block in full, for the states and copy they state.

### Judge
The six points of your agent definition, against the design source and patterns above: design source, tokens and components, states, responsive and platform fit, accessibility, feedback. Judge the screens as a set too: inconsistency between them is a finding. A verdict with no screenshot is not a verdict.

### Output - MAX 15 LINES plus one line per finding
VERDICT: PASS | FAIL
Instrument: [MCP server name used, or the built-in path]
Evidence: [screenshot per screen]
Findings: [ID, task ID or unattributed, level, criterion, screen, trigger and consequence, evidence -> fix]
Could not render: [what, and why]
Pre-existing: [unrelated findings, not task deductions]
```
