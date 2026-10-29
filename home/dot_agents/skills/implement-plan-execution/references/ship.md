# End of a Part, Ship of a Phase

## Part boundary

The current part's last task is committed and the phase has another part → hand off and end the session. The next session starts from the handoff, the plan, and the code.

1. Check: `git status` is clean apart from the plan directory. `git log -1` is the part's last task commit. Each claim in the part's `Ends with:` line maps to a closed task's `Done when`. A claim no closed task delivered → edit the line to what is true now, and name the change in the handoff
2. Part review, only when a task in this part was on the security surface: one `ship-reviewer` spawn with the SHIP REVIEW prompt below. `[scope]` is `Part review - [plan name], part [N.k]`. `[base]` is the previous part's handoff hash, or the phase base for the first part. Step 2 traces only the scenarios this part's tasks serve. Skip Step 4. It sees what per-task reviews cannot: duplication and drift across this part's tasks. READY → go on. NOT READY with a red suite → stop and ask: the part cannot end green. NOT READY otherwise → each finding to fix becomes a new task through the overflow row in `references/drift.md`. A task that lands in this part runs before the handoff. A task that lands in the next part is named in the handoff. No task on the security surface → no Part review. The last full-suite VERIFY then has to come after the part's last edit, as `SKILL.md` step 2 says. The ship review judges the whole phase later
3. Ledger: append `## Handoff - part [N.k] done - branch [branch] - [hash] - next: part [N.k+1], task [N]/[first open ID]`. Then one line per `Deviation:` or `## Ruling` from this part that the next part's tasks depend on, one `Accepted as-is:` line per remaining Part review finding, and one line per task the Part review added to the next part. Nothing else: the per-task entries already hold the rest
4. Report ≤8 lines: part done, tasks closed with scores, `Unverified:` lines, `## Found` items, and "Next part: start a fresh session and ask to continue the plan"
5. End the session. No ship review and no PR: the phase is not mergeable until its last part

## Ship

The last task in a phase's last part is committed, or setup found a phase whose ship was cut off → the phase is a PR, not a pause. Before the first dispatch, append `## Ship started - phase [N]` to the ledger, unless one already exists for this phase. The branch is the one this phase's `## Phase started` names.

### 1. Dispatch the ship reviewer

One fresh `ship-reviewer` spawn judges the whole phase, every part of it. `[scope]` is `Ship review - [plan name], phase [N]`. `[base]` is `main`, or the earlier phase's branch when the user chose to stack. No VERIFY spawn runs at ship: Step 1 of the prompt runs the full suite.

The phase touched a surface a human operates → a Tester goes out in the same parallel dispatch, with the TESTER prompt from `references/surface-prompts.md` and every operated scenario the phase serves, walked end to end on the branch. A visual surface adds the DESIGN REVIEW prompt for the phase's screens as a set, where inconsistency between screens shows.

Every phase also gets one Craft pass in the same dispatch, with the CRAFT prompt below: a fresh `tester` when the phase touched a surface a human operates, otherwise a fresh `ship-reviewer`. It runs at ship only, never per task or per part.

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

### SHIP REVIEW prompt

```
## [scope]

### Branch
`[branch]` off `[base]`. Run `git diff --stat [base]...HEAD` and `git log --oneline [base]..HEAD`.

Read [resolved shared rubric path]. Mandatory Acceptance criteria: [verbatim, every criterion mapped to this phase or part]. Accepted task findings and prior evidence: [ledger entries]. Preserve accepted findings unless new evidence changes their impact. Review integration, not another search for polish.

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

### 2. Present

- The PR description draft
- `## Found` entries from the ledger, for the user to triage: fix now as a task, file as an issue, or drop
- `Unverified:` lines collected across the phase

NOT READY with new tasks → they put the phase back in the cycle, and the ship runs again after them. NOT READY with no new task (a surface the Tester could not reach, say) → stop and ask: fix it, or ship as is.

### 3. Ask before pushing

Push and PR creation always need explicit approval. Never "proceeding unless you object".

The user's answer settles the phase. Append `## Shipped - phase [N] - [pushed | push declined | shipped as is] - [HEAD hash]`. No answer yet → no entry, so the next session resumes the ship and runs its review again.
