# Multi-Phase Implementation Plan Template

For features that ship as more than one PR: one file per phase. The next phase to execute is detailed. Every later phase is an outline until the phase before it merges, or the user chooses to stack on its branch:

```
.plans/{feature-name}/
├── requirements.md              # from implementation-plan-requirement
├── phase-1-{description}.md     # detailed: tasks, possibly in parts
├── phase-2-{description}.md     # outline
├── phase-3-{description}.md     # outline
└── progress.md                  # written by the executor
```

## Phase Naming

Descriptive of the behaviour the phase makes work, never a layer: `phase-1-create-order.md`, `phase-2-cancel-order.md`, `phase-3-order-export.md`.

## Outline Template

Enough for a later planning session to detail the phase without re-deriving its purpose. No tasks, no `path:line`.

```markdown
# Phase {N}: {Phase Name}

Status: outline

## Goal

{1–3 sentences: the feature this phase makes work, as a user or caller observes it.}

**Serves**: {scenario IDs}

**Prerequisites**: Phase {N-1} merged, or stacked on by the user's choice ({what it must provide: a contract, a table, a screen})

## Scope

- In: {behaviours, surfaces, and code areas by directory}
- Out: {what waits for a later phase, or a non-goal by pointer to requirements}

## Expected shape

{Expected parts: 1–3. More than three → this outline is two features. Split it now.}

## Settle when detailing

- {Open design question, and what will answer it: an earlier phase's contract, a ruling, a measurement}
```

`Status: outline` is the executor's stop signal: it never runs a file that carries it.

## Detailed Phase File

The detailing session replaces the whole outline with `references/template-single-phase.md`, changed in five places:

- Title: `# Phase {N}: {Phase Name}`, the first line of the file
- A `## Context` section before `## Design`: what this phase delivers and why it is mergeable on its own, then `**Serves**: {scenario IDs}` and `**Prerequisites**: Phase {N-1} merged ({what it provided})`
- Parts are numbered `{N}.{k}`. The last part's `Ends with:` ends "The phase is mergeable"
- Phase Verification traces only the scenarios this phase serves, not every scenario in `requirements.md`
- Phase Verification adds `Integration with Phase {N-1}: {what to exercise}`
