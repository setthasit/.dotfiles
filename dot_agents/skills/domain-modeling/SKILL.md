---
name: domain-modeling
description: Use when a project term is contested or missing — the same word means two things, a name in code contradicts how the team says it, or someone asks "what do we call this". Covers the committed root `CONTEXT.md` (Language, Relationships, Flagged ambiguities), what earns a glossary entry, keeping entries true through renames, and when a hard-to-reverse decision becomes an ADR instead.
---

# Domain Modeling

A project's ubiquitous language, kept in a committed `CONTEXT.md` at the repo root, plus ADRs for decisions that are hard to reverse.

These are real repo files. Unlike plan documents — git-ignored working artifacts — `CONTEXT.md` and ADRs are committed with the change that earns them.

## Active, not passive

Reading `CONTEXT.md` for vocabulary is not this skill. This skill fires when a term is contested: challenge the word, resolve the ambiguity, write the result down **in the same turn**. An ambiguity resolved in conversation and never committed is re-derived next session, usually differently.

## What earns an entry

A term earns an entry only if one of these holds:

| Trigger | Example |
|---|---|
| The project already uses the word for two different things | `job` is both a pipeline execution and a queue item |
| The concept exists in code with no name, and gets described in a phrase every time | "the workspace the invite was sent from" |
| A name in code contradicts how the team says it | table is `accounts`, everyone says "workspace" |

Everything else is jargon a reader infers from the code. Do not add it.

Cap the glossary at roughly a dozen live terms. A glossary nobody trusts is worse than none, and an exhaustive one goes stale within a release. Over the cap → delete the entries that no longer settle a live dispute. Removing a settled entry is maintenance, not information loss.

## `CONTEXT.md` format

Repo root. An `# {Project} — Context` title, then exactly these three `##` sections, in this order, and no others. New file → copy `assets/CONTEXT.template.md`.

| Section | Holds | Line form |
|---|---|---|
| `## Language` | one entry per term | `**Term**:` one-line definition, then an `_Avoid_:` line |
| `## Relationships` | cardinality between terms | flat bullets, terms bolded |
| `## Flagged ambiguities` | resolved naming disputes | flat bullets, each dated |

- The `_Avoid_:` line lists the rejected synonyms, comma-separated, so a reader stops using them. Omit the line only when no synonym was ever in use.
- No nesting, no sub-headings, no tables inside the sections.

Worked:

````markdown
## Language

**Workspace**: the billing and permission boundary; every row in the database is scoped to exactly one.
_Avoid_: org, organisation, tenant, account

**Run**: one execution of a pipeline, from trigger to terminal state.
_Avoid_: job, build, execution

## Relationships

- A **Workspace** holds many **Projects**; a **Project** never moves between them.
- A **Project** has many **Runs**; a **Run** belongs to exactly one **Project**.

## Flagged ambiguities

- 2026-04-12 — "job" meant both a **Run** and a queued background task. **Run** won for pipeline executions; the queue primitive is a **Task**.
````

## Keeping it true

- Code and glossary disagree → one of them is wrong. Fix the name in code or fix the entry; never leave both standing.
- Renaming a term is one change: the entry, its `_Avoid_` line, and every call site. Use `xd://lsp` rename, not text replacement — text replacement misses re-exports and rewrites unrelated strings.
- A term whose definition you cannot state in one line is not resolved yet. Resolve it before writing the entry.

## Multiple domains

One `CONTEXT.md` per package that owns its own domain; the root file then holds only what crosses packages. Do not add an index file until there is more than one file to index.

## When it is an ADR instead

Write an ADR when the decision is hard to reverse and surprising without context — when the glossary entry would have to explain *why*. `CONTEXT.md` says what a word means; an ADR says why the shape is what it is.

Location, required parts, and the append-only update rule: `references/adr.md`.

## In our flow

- `skill://implementation-plan-requirement` marks a resolved term or a hard-to-reverse decision `repo doc candidate` under `## Decisions`.
- `skill://implementation-plan-creator` turns each mark into its own committed task.
- The writer of that task uses the format above.

Naming rules for identifiers stay in `skill://clean-code`. Module, seam, and interface vocabulary stays in `skill://codebase-design`.
