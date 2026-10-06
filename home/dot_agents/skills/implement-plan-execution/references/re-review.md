# Scoped Re-review

Reached after any edit to a judged diff: a required fix round from `references/drift.md`, or optional polish from `references/notes-round.md`. A judge that re-reads the whole task after every edit finds new minors each round, and the task never converges. A re-review judges its prior findings and the edit, nothing else.

## Snapshot before the edit

Before forwarding findings to the writer, stage the task's `Files` paths that exist: `git add -- <Files paths>`. The index now holds the judged state. Restage before every round, so each re-review sees only its own round's edit.

| View | Command |
|---|---|
| The edit only | `git diff -- <Files paths>`, plus `git status` for files the edit created |
| The whole task | `git diff HEAD -- <Files paths>` |

## Who re-reviews

| Edit | Judges |
|---|---|
| Required fix | Message each judge of the previous round by its agent name or ID with the RE-REVIEW prompt. Every earned slot goes, including one that reported nothing: an edit can break what another axis passed |
| Required fix, judge gone | Fresh spawn of the same agent type: its full axis prompt from `references/task-review.md`, `references/review-prompts.md`, or `references/mechanical-check.md`, then the RE-REVIEW prompt with its previous report verbatim |
| Optional polish | One `reviewer` spawn with the RE-REVIEW prompt, mode optional polish, every prior report verbatim |

The coordinator scores the result with the shared rubric's re-review rule and routes through `references/drift.md`.

## RE-REVIEW prompt

```
## Re-review, [fix round N | optional polish] — Task [ID]: [task name]

The writer edited this task after it was judged. Judge the prior findings and the edit. Lines the edit did not touch were already judged: do not search them for new polish.

Read [resolved shared rubric path]. Mandatory Acceptance criteria: [verbatim].

### Step 1 — verify
[batch verification report]
[Task review, Standards, Mechanical check, or optional polish: "A failed or unavailable required check in this report means FAIL. Record the cause and prevented coverage. Attribute unrelated or sibling failures separately." Other axes: "This axis judges no verification."]
Never run the test, lint, or build commands yourself. A check you need re-run is a finding.

### Prior findings
[Resumed judge: "Your previous report." Otherwise every prior report verbatim. Then: selected for this edit -> IDs. Accepted as-is -> IDs with their reasons]

### The writer's report (verbatim)
[Finding ID -> changed or declined, with evidence]

### The edit
`git diff -- [Files paths]` and `git status` show the edit only. `git diff HEAD -- [Files paths]` shows the whole task, for context. Files this task may touch: [Files line, verbatim from the plan]

### Judge
1. Each selected finding -> resolved, or remains with evidence. A declined finding keeps its level
2. The edit itself, at full strength on your axis: a new defect, a regression, behaviour beyond the selected findings, a file outside the Files line
3. `Done when` and mandatory criteria still hold: [verbatim]. Tester: re-walk every line on the surface. Design review: re-render every screen the edit touches
4. A defect you now see on a line the edit did not touch: report it, marked `unchanged`. The rubric decides whether it deducts
5. Optional polish only: the edit changes behaviour, a contract, or a surface -> VERDICT: FULL REVIEW

### Output — MAX 15 LINES plus one line per finding
VERDICT: PASS | FAIL | FULL REVIEW
Verification: [each check in the batch verification report -> result, or not judged by this axis]
Evidence: [Tester and Design review: screenshot or transcript per line or screen re-checked]
Prior findings: [finding ID -> resolved with evidence | remains with reason]
Findings: [ID, level, criterion, location, edit | unchanged, trigger and consequence, evidence -> fix]
Unverified: [required coverage gaps or none]
```
