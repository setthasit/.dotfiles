# Fix Rounds

Reached when a decision is FIX or BLOCKED. A round runs in order: snapshot, FIX FORWARD, VERIFY as in `SKILL.md` step 2, scoped re-review. A judge that re-reads the whole task after every edit finds new minors each round, and the task never converges. A re-review judges its prior findings and the edit, nothing else.

## Snapshot before the edit

Before forwarding findings to the writer, stage the task's `Files` paths that exist: `git add -- <Files paths>`. The index now holds the judged state. Restage before every round, so each re-review sees only its own round's edit.

| View | Command |
|---|---|
| The edit only | `git diff -- <Files paths>`, plus `git status` for files the edit created |
| The whole task | `git diff HEAD -- <Files paths>` |

## FIX FORWARD - writer resume prompt

Resume the writer that made the change by message. Gone → a fresh writer of the same agent, as the paragraph after the prompt says.

```
## Fix round [N] - Task [ID]

### Selected findings
[Paste selected findings verbatim under their Task review, Standards, Spec review, Mechanical check, Tester, or Design review headings. Include all blockers. Preserve IDs and levels.]

### Acceptance
Read [resolved shared rubric path]. Mandatory criteria: [verbatim]. Current decision and deductions: [coordinator result]. Fix the selected findings, then stop. Do not pursue 100.

### Accepted as-is - do NOT change
[Findings deliberately kept, each with the reason. Omit if none.]

### Diagnosis (after the third failed review only)
[The DIAGNOSE report verbatim, and the fix or check it recommends. Omit otherwise.]

### Rules
- Fix ONLY what the findings name. No adjacent improvements
- A finding you disagree with: change nothing, state why with evidence. The judge resolves disputes. The writer cannot delete a deduction
- A finding needing a signature change, a new file, or logic moved between files: say so and stop. It is re-scoped as its own task, not a fix
- Run only the tests related to the files this round touched before reporting, as the CODE prompt's Rules say. Every long command runs under a time limit. Leave changes unstaged. Do NOT commit, edit the plan, or mention the plan anywhere you write

### Report
Write the full report to [plan dir]/reports/[phase]-[ID]-writer-fix-[N].md: each finding with what changed and the evidence, findings not addressed and why, each `Done when` line with the command and output that proves it, and each command run.

Then return at most 10 lines plus one line per finding:
- Report: [the file path]
- Finding ID -> changed or declined, with the evidence, one line each
- Done when: one line per line → holds / does not hold, the command, and the output line that proves it
- Tests run: the related-test command, pass/fail with counts
```

Fresh spawn instead of a resume → prepend these blocks of the CODE prompt in `references/subagent-prompts.md`: **Part brief**, **Task block**, **Scenarios served**, **Must not break**, **Do not touch**, and **Acceptance**. Then add: "The change under review is uncommitted in the working tree. Run `git diff HEAD -- [Files paths]` to see it."

## Who re-reviews

Every judge of the previous round, including one that reported nothing: an edit can break what another axis passed. Score the result with `references/scoring.md` and route by its decision.

| Judge | Dispatch |
|---|---|
| Still addressable | Message it by its agent name or ID with the RE-REVIEW prompt |
| Gone | Fresh spawn of the same agent: its full prompt from `references/task-review.md`, `references/review-prompts.md`, `references/surface-prompts.md`, or `references/mechanical-check.md`, then the RE-REVIEW prompt with its previous report verbatim |

## RE-REVIEW prompt

```
## Re-review, fix round [N] - Task [ID]: [task name]

The writer edited this task after it was judged. Judge the prior findings and the edit. Lines the edit did not touch were already judged: do not search them for new findings.

Read [resolved shared rubric path]. Mandatory Acceptance criteria: [verbatim].

### Step 1 - verify
[batch verification report]
[Tester and Design review only: "Context only. Launch the surface as your first prompt says."]

### Prior findings
[Resumed judge: "Your previous report." Fresh spawn: its previous report verbatim.]
Selected for this edit: [IDs]. Accepted as-is: [IDs, each with its reason]

### The writer's report (verbatim)
[Finding ID -> changed or declined, with evidence]

### The edit
`git diff -- [Files paths]` and `git status` show the edit only. `git diff HEAD -- [Files paths]` shows the whole task, for context. Files this task may touch: [Files line, verbatim from the plan]

### Judge
1. Each selected finding -> resolved, or remains with evidence. A declined finding keeps its level
2. The edit itself, at full strength on your axis: a new defect, a regression, behaviour beyond the selected findings, a file outside the Files line
3. `Done when` and mandatory criteria still hold: [verbatim]. Tester: re-walk every line on the surface. Design review: re-render every screen the edit touches
4. A defect you now see on a line the edit did not touch: report it, marked `unchanged`. The rubric decides whether it deducts

### Output - MAX 15 LINES plus one line per finding
VERDICT: PASS | FAIL
Verification: [each check in the batch verification report -> result, or not judged by this axis]
Evidence: [Tester and Design review: screenshot or transcript per line or screen re-checked]
Prior findings: [finding ID -> resolved with evidence | remains with reason]
Findings: [ID, level, criterion, location, edit | unchanged, trigger and consequence, evidence -> fix]
Unverified: [required coverage gaps or none]
```

## DIAGNOSE - scout after the third failed review

```
Read-only investigation. Do not modify anything.

Task [ID] has failed review three times. Each round ended in FIX or BLOCKED. Run `git diff HEAD -- [Files paths]` for the current attempt.

Per round 1 to 3, coordinator decision with score, then every judge's findings:
[verbatim, under round and axis headings]
Writer reports, per fix round:
[each short report verbatim. Its full report file is named in it: read the file when the short report does not answer a question]

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
