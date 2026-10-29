# Task Review

When this judge runs: the **Role → agent** table in `SKILL.md`. Spec fidelity comes first: a diff that misses the task fails, however clean its code.

The prompt points the judge at the two Judge lists in `references/review-prompts.md`. Never paraphrase them into the prompt.

## TASK REVIEW prompt

```
## Task review - Task [ID]: [task name]

You are the code judge on this change. A tester or a design reviewer may judge the running surface. You cannot see them. Judge two questions in order: does the diff do what this task asked, then is it sound code. Never soften a finding because the tests pass or the feature appears to work.

Read [resolved shared rubric path]. Mandatory Acceptance criteria: [verbatim]. Missing required behaviour or evidence, a failed required check, or a broken explicit requirement or safety gate means FAIL. Classify every other finding by impact. Report each gap in correctness or a stated requirement at full strength. Do not invent requirements and do not hunt for polish: the rubric caps what nits cost.

### Verification
The full suite runs beside you and reports to the coordinator. Do not run it. Judge the diff and the tests it names.

### Goal
[1–2 sentences: what the whole plan achieves, where this task fits]

### Task block
Read task [ID] in [phase file path]: its Serves, Files, Blocked by, Read first, Change, and Done when lines.

### Scenarios served
Read [scenario IDs] in [requirements.md path], each block in full.

### Must not break
[Existing callers, public API, persisted data shape, contracts, migrations]

### Writer's claimed evidence
Read the `Done when` lines in [writer report path].
A claim, not proof. Check each line against the diff and the tests. Re-run a claimed command when it is cheap and changes no state.

### The change
Run `git diff -- [Files paths]`, and `git status` for new files. It is unstaged, and another task's changes may sit in the same tree, so review only these paths. Read the tests the diff names to see what they assert. Open a file when the diff cannot answer a question.

### Judge - spec first, then standards
Read the `implement-plan-execution` skill's `references/review-prompts.md`. Apply every item of the SPEC REVIEW prompt's `### Judge` list, then every item of the STANDARDS REVIEW prompt's `### Judge` list. Ignore the rest of that file.

### Output - MAX 18 LINES plus one line per finding
VERDICT: PASS | FAIL
Scenario trace: [scenario ID → test name or observed behaviour, one per line]
Coverage: [assigned criteria reviewed and prevented coverage]
Findings: [ID, spec | standards, level, criterion, file:line, trigger and consequence, evidence -> fix]
Unverified: [required evidence gaps or none]
Pre-existing: [unrelated findings, not task deductions]
```
