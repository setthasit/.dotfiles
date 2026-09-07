# Session Setup

Once per session, before any dispatch. Every item is a read of a planning file, a manifest, or git state — nothing else.

1. **Working tree** — `git status`. Uncommitted unrelated changes break per-task staging; dirty → stop and ask
2. **Plan directory ignored** — `git check-ignore <plan dir>` must succeed. Not ignored → report and ask how to exclude it (`.gitignore` vs `.git/info/exclude`); never edit `.git/` or git config without approval
3. **Plan** — read the current phase file whole: design, tasks, implementation details, phase verification. Read `requirements.md` for Goal and Non-goals only; the writer receives its scenarios per task
4. **Ledger** — `progress.md` exists → read its tail (last ten entries) and the `## Next` line; run the resume reconciliation from the skill. Missing → created at the first close-out
5. **Project rules** — `<repo-rules>` are already injected; open `CONTRIBUTING.md` or `docs/` only if the plan points there
6. **Verification commands** — from `Makefile`, `package.json` scripts, `Cargo.toml`, `Package.swift`, CI workflow. Record test, lint, build. Never invent a command the repo does not define; none exists → say so now
7. **Agents** — writer `task` (`sonic` for mechanical steps), two review slots per task: Standards `reviewer` (`security-reviewer` when the task touches auth, crypto, input validation, secrets, or tenant data) and Spec `reviewer`; scout `scout`. A project-specific agent file under `~/.omp/agent/agents/` takes precedence when present
8. **Progress** — count `[x]` vs `[ ]` per phase; the first phase with open tasks is the current one
9. **Branch** — after confirmation, `git checkout -b <type>/<phase-topic>` off `main`, or off the phase's stated prerequisite branch
10. **Summary and confirmation** — present, wait

```
## Plan: [name]

### Goal
[1–3 sentences in your own words — proves the plan was read, not skimmed]

| Phase | Status | Progress |
|-------|--------|----------|
| 1     | COMPLETE | 5/5 |
| 2     | IN PROGRESS | 3/8 |

### Branch
`[branch]` — phase [N]

### Verification commands found
test: <cmd>  |  lint: <cmd>  |  build: <cmd>

### Agents
writer: <name>  |  standards: <name>  |  spec: <name>

### Next task
[ID] — [description] — Done when: [first line]

Proceed?
```
