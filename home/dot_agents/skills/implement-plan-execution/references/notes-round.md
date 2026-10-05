# Optional Notes Round

Reached only when a task already has coordinator PASS and a writer proposes small, safe polish or the user requests it. Default: record remaining findings and close out. Do not dispatch a writer just because notes exist.

## The rule

1. At most one optional pass per task. Send only the chosen findings through FIX FORWARD. All other accepted findings stay unchanged.
2. Behavior, public-contract, or surface changes require the full earned judging slots. A rename, comment edit, or equivalent internal cleanup earns one Notes check below.
3. Any applied edit invalidates the previous acceptance until verified. The Notes check must detect regression risk, not just confirm the writer's report.
4. The coordinator recalculates from unresolved findings plus new supported findings. PASS → close out without more polish. A gate failure or score below acceptance → required fix routing in `references/drift.md`.

Optional polish is not a required fix round. A regression it introduces enters the required cycle and its existing diagnosis limits. Never silently log a newly introduced blocker as future work.

## NOTES CHECK prompt

```
## Notes check — Task [ID]: [task name]

Read [resolved shared rubric path]. Mandatory Acceptance criteria: [verbatim]. Judge only the chosen edits and their regression risk. Do not search the whole task for new polish.

### Step 1 — verify
Run [test cmd], [lint cmd], [build cmd]. Failed or unavailable required checks mean FAIL. Record the cause and prevented coverage.

### Prior acceptance and findings
[Coordinator score, original reports, chosen findings, accepted findings, and evidence references]

### The writer's report (verbatim)
[Finding ID -> changed or declined, with evidence]

### The change
Run `git diff -- [Files paths]` (and `git status` for new files). It is unstaged. Files this task may touch: [Files line, verbatim from the plan]

### Judge
1. Confirm each selected finding resolved or remains. A declined finding retains its deduction.
2. No unreviewed behavior, contract, or surface change. Such changes require full reviews.
3. `Done when` and mandatory criteria still hold: [verbatim checks].
4. Report any new supported blocker, material, or minor concern. No additional polish search.

### Output — MAX 15 LINES
VERDICT: PASS | FAIL | FULL REVIEW
Verification: [command and working directory -> result]
Coverage: [reviewed edits and prevented coverage]
Notes trace: [finding ID -> resolved with evidence | remains with reason]
Findings: [ID, level, criterion, location, trigger and consequence, evidence -> fix]
Unverified: [required coverage gaps or none]
```
