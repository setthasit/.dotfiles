# Task Review

When this judge runs: the **Role → agent** table in `SKILL.md`. Spec fidelity comes first: a diff that misses the task fails, however clean its code.

Paste the two Judge lists verbatim from the STANDARDS REVIEW and SPEC REVIEW prompts in `references/review-prompts.md`. Never paraphrase them.

## TASK REVIEW prompt

```
## Task review - Task [ID]: [task name]

You are the code judge on this change. A tester or a design reviewer may judge the running surface. You cannot see them. Judge two questions in order: does the diff do what this task asked, then is it sound code. Never soften a finding because the tests pass or the feature appears to work.

Read [resolved shared rubric path]. Mandatory Acceptance criteria: [verbatim]. Missing required behaviour or evidence, a failed required check, or a broken explicit requirement or safety gate means FAIL. Classify every other finding by impact. Report each gap in correctness or a stated requirement at full strength. Do not invent requirements and do not hunt for polish: the rubric caps what nits cost.

### Step 1 - verify before reading anything
[batch verification report]

### Goal
[1–2 sentences: what the whole plan achieves, where this task fits]

### Task block (verbatim from plan)
Serves / Files / Blocked by / Read first / Change / Done when: [exactly as sent to the writer]

### Scenarios served (verbatim from requirements.md)
[Each R/S block this task serves: the same text the writer received]

### Must not break
[Existing callers, public API, persisted data shape, contracts, migrations]

### Writer's claimed evidence
[The `Done when` lines of the writer's short report, verbatim]
A claim, not proof. Check each line against the diff, the tests, and the batch verification report. Re-run a claimed command when it is cheap and changes no state.

### The change
Run `git diff -- [Files paths]`, and `git status` for new files. It is unstaged, and another task's changes may sit in the same tree, so review only these paths. Read the tests the diff names to see what they assert. Open a file when the diff cannot answer a question.

### Judge - spec first
[SPEC REVIEW Judge list, every item, verbatim]

### Judge - standards second
[STANDARDS REVIEW Judge list, every item, verbatim]

### Output - MAX 18 LINES plus one line per finding
VERDICT: PASS | FAIL
Verification: [each check in the batch verification report -> result, with its working directory]
Scenario trace: [scenario ID → test name or observed behaviour, one per line]
Coverage: [assigned criteria reviewed and prevented coverage]
Findings: [ID, spec | standards, level, criterion, file:line, trigger and consequence, evidence -> fix]
Unverified: [required evidence gaps or none]
Pre-existing: [unrelated findings, not task deductions]
```
