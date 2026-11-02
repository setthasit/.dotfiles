# End of a Part, Ship of a Phase

## Part boundary

The current part's last task is committed and the phase has another part → hand off and end the session. The next session starts from the handoff, the plan, and the code.

1. Check: `git status` is clean apart from the plan directory. `git log -1` is the part's last task commit. Each claim in the part's `Ends with:` line maps to a closed task's `Done when`. A claim no closed task delivered → edit the line to what is true now, and name the change in the handoff
2. Verification: the last full-suite VERIFY came after the part's last edit, as `SKILL.md` step 2 says. Red → stop and ask: the part cannot end green
3. Ledger: append `## Handoff - part [N.k] done - branch [branch] - [hash] - next: part [N.k+1], task [N]/[first open ID]`. Then one line per `Deviation:` or `## Ruling` from this part that the next part's tasks depend on. Nothing else: the per-task entries already hold the rest
4. Report ≤8 lines: part done, tasks closed with scores, `Unverified:` lines, `## Found` items, and "Next part: start a fresh session and ask to continue the plan"
5. End the session. No ship review and no PR: the phase is not mergeable until its last part

## Ship

The last task in a phase's last part is committed, or setup found a phase whose ship was cut off → the phase is a PR, not a pause. Before each run's first dispatch, append `## Ship started - phase [N] - [HEAD hash]` to the ledger. The branch is the one this phase's `## Phase started` names. An earlier run's ship review reached its PR description, and that run's hash differs from HEAD → this run is a rerun: see **Ship rerun**.

### 1. Dispatch the ship reviewer

One fresh `ship-reviewer` spawn judges the whole phase, every part of it. `[scope]` is `Ship review - [plan name], phase [N]`. `[base]` is `main`, or the earlier phase's branch when the user chose to stack. No VERIFY spawn runs at ship: Step 1 of the prompt runs the full suite.

The phase touched a surface a human operates → a Tester goes out in the same parallel dispatch, with the TESTER prompt from `references/surface-prompts.md` and every operated scenario the phase serves, walked end to end on the branch. A visual surface adds the DESIGN REVIEW prompt for the phase's screens as a set, where inconsistency between screens shows.

Every phase also gets one Craft pass in the same dispatch, with the CRAFT prompt below: a fresh `tester` when the phase touched a surface a human operates, otherwise a fresh `ship-reviewer`. It runs at ship only, never per task or per part.

The **Role → agent** table's condition holds → a Security review goes out in the same dispatch, with the SECURITY REVIEW prompt below. It is the phase's deep security pass, so no task gets one.

### CRAFT prompt

```
## Craft pass - [plan name], phase [N]

You judge whether this phase is finished to its quality bar. Whether it works is another judge's axis, and you cannot see that judge. Load the `product-craft` skill and run its Craft audit on this phase's scope. Never edit code.

### Branch
`[branch]` off `[base]`. Run `git diff --stat [base]...HEAD`.

### Surface
[how to start it and where this phase's work shows, from the part briefs] | none: a service, API, CLI, or library, driven by its own commands

### Quality bar (verbatim from requirements.md)
[`## Quality bar` section, or "none written: audit against the domain checklist and report every gap under Beyond the bar"]
Craft criteria for this phase: [every `Craft:` Acceptance line mapped to this phase, verbatim]

### Batch verification report
[last `## Verification` entry]
Context only. It can explain a surface that will not start.

### Output - MAX 25 LINES plus one line per finding
VERDICT: PASS | FAIL
Instrument: [tool or command used]
Matrix: [rows observed out of total, each unobserved row named]
Budgets: [each Craft criterion → measured value, or unmeasured and why]
Findings: [ID, level, criterion, step, observed against expected, evidence, standard source -> fix]
Beyond the bar: [gaps no criterion names, one line each]
Not verified: [checks that need a human, as steps the user can take]
```

A Craft finding against a `Craft:` criterion scores like any mandatory Acceptance criterion. Each `Beyond the bar` line becomes a `## Found - craft - ...` ledger entry. Never a fix task without the user.

### SECURITY REVIEW prompt

```
## Security review - [plan name], phase [N]

You judge the whole phase as an attacker would see it. Read code, never run a payload.

### Branch
`[branch]` off `[base]`. Run `git diff --stat [base]...HEAD`, then read the diff of every path on the security surface.

### Security scope (verbatim from requirements.md)
[`## Security scope` section, or "none written: every route counts"]
Security criteria for this phase: [every `Security:` Acceptance line mapped to this phase, and every Mandatory line that asks for a security review, verbatim]

### Routes noted during the phase
[every `## Security note` entry for this phase, from `grep '^## Security note'` on the ledger]
Claims to check. Each is live, closed by later code, or not a route.

### Judge
1. Trace each entry point this phase added or changed to its sink, through the callers that now exist
2. Each security criterion holds, with the evidence
3. Each noted route: `live`, `closed` with the code that closed it, or `not a route`. A `live` route inside the Security scope is also a finding
4. A route outside the Security scope goes under Release items. It carries no level and no deduction. A control the code already has is never out of scope

### Output - MAX 25 LINES plus one line per finding
VERDICT: PASS | FAIL
Noted routes: [each note → live | closed | not a route, with evidence]
Findings: [ID, level, criterion, file:line, trigger and consequence, evidence -> fix]
Release items: [route, the stage that needs it closed]
Unverified: [required coverage gaps or none]
```

Security findings become tasks like any ship finding, grouped into one task per root cause. Each `Release items` line becomes `## Found - security - release item - ...`.

### SHIP REVIEW prompt

```
## [scope]

### Branch
`[branch]` off `[base]`. Run `git diff --stat [base]...HEAD` and `git log --oneline [base]..HEAD`.

Read [resolved shared rubric path]. Mandatory Acceptance criteria: [verbatim, every criterion mapped to this phase]. Accepted task findings and prior evidence: [ledger entries]. Preserve accepted findings unless new evidence changes their impact. Review integration, not another search for polish.

### Step 1 - full verification
Run [test cmd], [lint cmd], [build cmd]: the whole suite, not the last task's subset. Red → report failing names and stop.

### Step 2 - scenario trace
Scenarios to trace (verbatim from requirements.md):
[R/S blocks]

For each: name the test (file and test name) or the observed behaviour that proves it. A scenario with neither → list it under "Unserved".

### Step 3 - hygiene and burden
- `git diff [base]...HEAD` contains no plan file and no reference to one (plan filename, task ID, phase number, requirement ID)
- Any single non-test file whose diff exceeds ~600 lines → list it (review-burden signal, not a failure)

### Step 4 - PR description draft
Restate the work in repo terms: no plan filename, task ID, phase number, or requirement ID. Sections:
- What changed
- Why
- Review order: logic files only, most subtle first, each with a `file:line` and one sentence on what to look for. Then one line naming test and fixture paths as skim-only
- Verification: commands run and results, real-binary or live-API checks, screenshots for UI
- Not verified
- Accepted as-is: findings deliberately kept, each with its reason

### Output - MAX 40 LINES plus one line per finding
VERDICT: READY | NOT READY
Suite: [pass/fail, failing names]
Unserved scenarios: [list or none]
Findings: [ID, level, criterion, location, trigger and consequence, evidence -> fix]
Unverified: [required coverage gaps or none]
Burden: [files or none]
PR description:
[draft]
```

Score the integration findings of every judge with `references/scoring.md`. Never sum or average task scores into a phase score, and never charge an accepted task finding again. READY needs complete coverage, green required verification, and a PASS decision. A new blocker or a FIX decision returns to the cycle as a new task. Report accepted task findings in the PR description.

### Ship rerun

Fix tasks from a ship run are committed → the ship runs again on what changed. The rerun base is the hash of the latest `## Ship started` entry whose ship review reached its PR description and whose hash differs from HEAD. `git diff --stat [rerun base]..HEAD` is the rerun's scope.

| Judge | On a rerun |
|---|---|
| Ship reviewer | Runs, with `Rerun: judge only [rerun base]..HEAD` added to its prompt. Step 1 in full. Steps 2 and 3 cover the scenarios the fix tasks serve and that diff. Step 4 updates the draft |
| Tester | Walks the scenarios the fix tasks serve, plus each scenario whose steps cross a changed path |
| Design review | Only the screens that diff changes. None → skipped |
| Security review | Only when that diff touches a path on the security surface or a path its findings named, or the ledger gained a `## Security note`. It judges that diff and those notes |
| Craft pass | Skipped. A fix task that moved a `Craft:` line's measured value → the Tester re-measures that line |

### 2. Present

- The PR description draft
- `## Found` entries from the ledger, for the user to triage: fix now as a task, file as an issue, or drop
- `Unverified:` lines collected across the phase

NOT READY with new tasks → they put the phase back in the cycle, and the ship runs again after them. NOT READY with no new task (a surface the Tester could not reach, say) → stop and ask: fix it, or ship as is.

### 3. Ask before pushing

Push and PR creation always need explicit approval. Never "proceeding unless you object".

The user's answer settles the phase. Append `## Shipped - phase [N] - [pushed | push declined | shipped as is] - [HEAD hash]`. No answer yet → no entry, so the next session resumes the ship and runs its review again.
