# Ship the Phase

The last task in a phase is committed → the phase is a PR, not a pause.

## 1. Dispatch the ship reviewer

Fresh `reviewer` spawn — one, not two axes: the phase is judged whole. Prompt:

```
## Ship review — [plan name], phase [N]

### Branch
`[branch]` off `main`. Run `git diff --stat main...HEAD` and `git log --oneline main..HEAD`.

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

### Output — MAX 40 LINES
VERDICT: READY | NOT READY
Suite: [pass/fail, failing names]
Unserved scenarios: [list or none]
Burden: [files or none]
PR description:
[draft]
```

Red suite or an unserved scenario → back to the cycle with a new task; do not ship.

## 2. Present

- The PR description draft
- `## Found` entries from the ledger, for the user to triage: fix now as a task, file as an issue, or drop
- `Unverified:` lines collected across the phase

## 3. Ask before pushing

Push and PR creation always need explicit approval. Never "proceeding unless you object".

## 4. After merge

Next phase branches off `main`. Stack on the current branch only for a genuine dependency, and say so. A phase boundary is the cheapest place to start a fresh session.

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
