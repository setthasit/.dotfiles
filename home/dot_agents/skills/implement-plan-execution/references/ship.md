# End of a Part, Ship of a Phase

## Part boundary

The current part's last task is committed and the phase has another part → hand off and end the session. Context spent on this part does not carry to the next one: the next session starts from the handoff, the plan, and the code.

1. Check: `git status` is clean apart from the plan directory. `git log -1` is the part's last task commit. Each claim in the part's `Ends with:` line maps to a closed task's `Done when`. A claim no closed task delivered → edit the line to what is true now, and name the change in the handoff
2. Ledger: append `## Handoff — part [N.k] done — branch [branch] — [hash] — next: part [N.k+1], task [first open ID]`. Then one line per `Deviation:` or `## Ruling` from this part that the next part's tasks depend on. Nothing else: the per-task entries already hold the rest
3. Report ≤8 lines: part done, tasks closed with scores, `Unverified:` lines, `## Found` items, and "Next part: start a fresh session and ask to continue the plan"
4. End the session. No ship review and no PR: the phase is not mergeable until its last part

## Ship

The last task in a phase's last part is committed → the phase is a PR, not a pause. The ship reviewer judges the whole phase, every part of it: `<base>...HEAD`, where the base is `main`, or the earlier phase's branch when the user chose to stack. Replace `main` with that base in the prompt below.

## 1. Dispatch the ship reviewer

Fresh ship-reviewer spawn from the skill's **Role → agent** table — one, not two axes: the phase is judged whole. The phase touched a surface a human operates → a Tester spawn goes out in the same parallel dispatch with the TESTER prompt from `references/review-prompts.md` and every operated scenario the phase serves, walked end to end on the branch; a visual surface adds the DESIGN REVIEW prompt for the phase's screens as a set, where inconsistency between screens shows up and a per-task review cannot see it. Prompt:

```
## Ship review — [plan name], phase [N]

### Branch
`[branch]` off `main`. Run `git diff --stat main...HEAD` and `git log --oneline main..HEAD`.

Read [resolved shared rubric path]. Mandatory Acceptance criteria for this phase: [verbatim, all mapped criteria and universal gates]. Accepted task findings and prior evidence: [ledger entries]. Preserve accepted findings unless new evidence changes their impact. Review integration, not another search for polish.

### Step 1 — full verification
Run [test cmd], [lint cmd], [build cmd] — the whole suite, not the last task's subset. Red → report failing names and stop.

### Step 2 — scenario trace
Scenarios this phase serves (verbatim from requirements.md):
[R/S blocks]

For each: name the test (file and test name) or the observed behaviour that proves it. A scenario with neither → list it under "Unserved".

### Step 3 — hygiene and burden
- `git diff main...HEAD` contains no plan file and no reference to one (plan filename, task ID, phase number, requirement ID)
- Any single non-test file whose diff exceeds ~600 lines → list it (review-burden signal, not a failure)

### Step 4 — PR description draft
Sections: What changed / Why / Review order (logic files, most subtle first, file:line + one sentence each; tests as skim-only) / Verification / Not verified / Accepted as-is. No plan references.

### Output — MAX 40 LINES plus one line per finding
VERDICT: READY | NOT READY
Suite: [pass/fail, failing names]
Unserved scenarios: [list or none]
Findings: [ID, level, criterion, location, trigger and consequence, evidence -> fix]
Unverified: [required coverage gaps or none]
Burden: [files or none]
PR description:
[draft]
```

Apply the shared rubric to phase integration findings across all earned slots. READY requires complete coverage, green required verification, and acceptance on those findings. Do not sum or average task scores into a phase score or charge accepted task findings again. A newly supported integration blocker or below-threshold result returns to the cycle as a new task. Report accepted task findings in the PR description.

## 2. Present

- The PR description draft
- `## Found` entries from the ledger, for the user to triage: fix now as a task, file as an issue, or drop
- `Unverified:` lines collected across the phase

## 3. Ask before pushing

Push and PR creation always need explicit approval. Never "proceeding unless you object".

## 4. After merge

Next phase branches off `main`. Stack on the current branch only when the user chooses it for a genuine dependency. A phase boundary is the cheapest place to start a fresh session.

## PR description

No plan filename, task ID, phase number, or requirement ID. Restate the ledger in repo terms.

```markdown
## What changed
## Why
## Review order
Logic files only, most subtle first, each with a `file:line` and one sentence on what to look for.
Then one line naming test and fixture paths as skim-only.
## Verification
Commands run and results. Real-binary or live-API checks, concretely. Screenshots for UI.
## Not verified
## Accepted as-is
Reviewer findings deliberately kept, each with its reason.
```

A description that only lists filenames has done nothing. The reviewer reads the logic in the order named, or reads every file alphabetically and understands none of them.
