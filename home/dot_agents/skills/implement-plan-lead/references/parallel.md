# Parallel Phases

Reached when `plan_check.py status` prints `runnable:`. A **lane** is one phase running in its own worktree with its own copy of the plan. At most two lanes run at once: lanes spend the usage limit faster.

Serial is the default. A wrong parallel call breaks a merge or corrupts shared data, and a wrong serial call only costs time. Every doubt goes to serial.

## 1. Gate

All hold, otherwise run serial with no new ruling:

- The host map names a worktree spawn
- `progress.md` has no `## Ruling - rest of this plan runs serial`
- Every phase on the `runnable:` line with a `## Phase started` is a running lane: a phase started serially finishes serially
- At or below Y, the line holds two unstarted phases, or one unstarted phase beside a running lane
- The base branch is not moving by hand: the user is not committing to it during the run

## 2. Detail both phases

Take the two lowest unstarted runnable phases at or below Y, or the lowest one when a lane is running. Each outline gets a planner, in one parallel dispatch, with the PLANNER prompt's `Parallel` block filled. Approve each by **Plan**, with `planned ahead at [HEAD hash]` in its Ruling.

## 3. Prove independence

Run `python3 ~/.agents/skills/implementation-plan-creator/scripts/plan_check.py overlap <plan dir> [A] [B]`. It prints anything but `overlap: none` → the pair stays serial, by the ruling below, with `Code` as the factor. Otherwise spawn a fresh `reviewer` with the PARALLEL CHECK prompt. Its job is to refute the pair.

Every factor `independent` → append `## Ruling - phases [A], [B] run in parallel - [one line of evidence per factor]`. Any `conflict` or `unknown` → append `## Ruling - phases [A], [B] stay serial - [factor] - [evidence]`, and take the lower phase by the normal Loop. The higher phase keeps its `planned ahead` ruling, so **Ship** step 8 reconciles it.

```
## Parallel check - [plan name], phases [A] and [B]

Two phases may run at the same time, each in its own worktree of this repo, then merge one after the other. Find what breaks. Read [phase A file], [phase B file], and the code their `Read first` lines point at. Change nothing, and start no app or server.

For each factor answer `independent` with path:line evidence, `conflict` with the evidence, or `unknown`. A factor you could not settle is `unknown`. Never answer `independent` from the plan's wording alone.

| Factor | Independent when |
|---|---|
| Code | Neither phase changes a symbol, route, schema, type, or config key the other calls or reads, in any file |
| Data | No shared migration chain, schema, seed, fixture, database, or data file. Two phases that each add the next migration conflict |
| Generated output | No shared lockfile, generated code, snapshot, golden file, asset build, or manifest that either rebuilds |
| Test suite | Neither phase's tests pin a count, list, or value the other changes |
| Runtime | Both can run their app and tests at once, with their own ports, database or temp directory, and caches. Name the setting for each |
| Browser | Each lane's Tester and Design review get their own browser context, or the project's run rules make them take turns |
| Machine | No check needs the machine alone: frame-rate captures, timing budgets, an unlocked screen, a device, a simulator, a GPU. A lock the project already holds counts only when a waiting run cannot time out on it |
| External | No shared paid budget, rate limit, account, sandbox, or remote test resource |
| Behaviour | Neither phase's acceptance measures the other's result, and neither design assumes something the other changes |
| Setup | A fresh checkout installs and runs with a command the repo defines. Name it |

### Output - MAX 25 LINES
[factor]: independent | conflict | unknown - [evidence]
Lane setup: [commands a fresh worktree runs before its first test]
Lane run rules: phase [A]: [ports, data paths, browser rule] | phase [B]: [the same]
```

## 4. Run a lane

Every part is a fresh `coordinator` in a worktree spawn, with the COORDINATOR prompt's `Lane` block filled. The worktree holds that part only. An agent in a worktree writes nowhere else, so the plan travels with it:

| Step | Who | Action |
|---|---|---|
| Start of a part | coordinator | Copies the plan in, checks out or creates the branch, runs the lane setup |
| End of a part | coordinator | Commits, runs `git checkout --detach` so the next worktree can take the branch, reports `HANDOFF` with its `pwd` |
| Handoff | lead | **Bring back** the worktree, then spawn the next part |

`HANDOFF` checks run against the worktree: `git -C <worktree> status --short` prints nothing, and `plan_check.py status <worktree plan dir> --phase [N]` names the next part. Every `## Ruling` goes to the main `progress.md`, and the same message carries it to the coordinator. Each lane's reports are handled on their own, by **Execute** and **Answer**.

A lane ships → the next runnable phase at or below Y goes through steps 1 to 3 against the lane still running.

**Bring back**, from the main checkout:

```
rsync -a --update --exclude progress.md <worktree plan dir>/ <plan dir>/
git worktree unlock <worktree>
git worktree remove <worktree>
git branch -d <the worktree's starting branch>
```

The spawn's result names the worktree and its starting branch. `remove` deletes every ignored file, the plan copy included, so run it only after `rsync` exits 0. `rsync` fails → stop here and keep the worktree. Skip `unlock` when `git worktree list` does not show the worktree as `locked`. `remove` or `branch -d` refuses → leave it, and name it in the final report. Never force either.

## 5. Ship a lane

Run **PR lookup** and **Ship** from the main checkout, which stays on the base branch. In **PR lookup**, skip `git checkout <branch>`, and read HEAD with `git -C <worktree> rev-parse HEAD` and `git -C <worktree> merge-base --is-ancestor`. The lanes ship in the order their `SHIP` reports arrive, and only one lane is between steps 4 and 7 at a time.

Before step 4, and again before step 6, check `git merge-base --is-ancestor <base> <branch>`. Exit 1 means the other lane merged first, so message the coordinator:

```
## Merge base - phase [N]

Run `git merge -m "[AI] merge base into phase branch" [base]`. It stops on a conflict → `git merge --abort`, and report QUESTION with the conflicted paths. It merges → run the skill's Ship rerun, with the pre-merge HEAD as the rerun base. Report SHIP.
```

A conflict, or a failure caused by the other lane, means the Parallel check was wrong. Message the coordinator to add a task that merges the base and resolves it, and append `## Ruling - rest of this plan runs serial - [factor] was wrong - [evidence]`. The second lane's full suite and ship rerun on the merged code stop a wrong call from reaching the base.

Step 7 done → **Bring back**.

## 6. Stop and resume

**Stop the run** → message each running coordinator to finish its current commit and report. Keep every worktree, and name each one with its branch in the final report.

After an interruption, `git worktree list` names the lanes, and `.claude/` in `git status` is those worktrees. For each lane with no running coordinator:

| `git -C <worktree> status --short` | Action |
|---|---|
| Prints nothing | `git -C <worktree> checkout --detach`, **Bring back**, then spawn the part `plan_check.py status <plan dir> --phase [N]` names, with the `Lane` block |
| Prints anything | **Stop the run**, and name the worktree: its uncommitted work needs the user |
