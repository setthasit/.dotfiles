# Skill Anatomy

Reached from `SKILL.md` when creating a skill, splitting one, or auditing the directory.

## Layout

```
skills/<name>/
  SKILL.md          required — frontmatter + the steps every invocation needs
  references/       optional — disclosed detail, one topic per file, kebab-case
  scripts/          optional — deterministic work, run not read
  assets/           optional — templates, fixtures, boilerplate the agent copies
```

- Directory name is the skill name: lowercase, kebab-case, no version suffix.
- No `README.md` in a skill directory. `SKILL.md` is the entry point; a second entry point splits the reader.
- No nested skill directories.

## Frontmatter

| Field | Required | Notes |
|---|---|---|
| `name` | yes | Matches the directory name exactly |
| `description` | yes | The context pointer. Budgets in `SKILL.md` |
| `license`, `metadata`, `compatibility` | no | Only on vendored skills that shipped with them; do not add to authored skills |

Anything else is noise: the harness reads `name` and `description`.

## Choosing the file kind

| The content is | Put it |
|---|---|
| A step every invocation runs | `SKILL.md` |
| A table most invocations consult | `SKILL.md` |
| Detail one branch needs (a language, a provider, a rare mode) | `references/<branch>.md` |
| A procedure with an exact command sequence and parseable output | `scripts/<name>.py` or `.sh` |
| Text the agent copies into the repo | `assets/<name>.<ext>` |

A reference nobody points at is dead weight. Either point at it from `SKILL.md` (or from another reference that is itself reachable) or delete it.

## Splitting an over-cap skill

Order matters — the first two usually finish the job.

1. **No-op pass.** Delete every line the model already obeys, every rule a tool enforces, every restatement of the harness defaults. Measure again.
2. **Duplication pass.** Collapse the same rule stated in two sections. Replace another skill's rules with `skill://<name>`.
3. **Split by branch.** One `references/` file per branch that only some invocations reach. `SKILL.md` keeps the dispatch table and the pointer.
4. **Split by sequence.** A long linear procedure becomes one file per phase under `references/`, with `SKILL.md` holding the loop and the gates.
5. **Split by invocation.** Only when a distinct trigger word exists, or two skills would reuse the piece. A new skill costs permanent description load in every session; a reference costs nothing until its pointer fires.

## Auditing a skill directory

```
python3 skills/writing-for-agents/scripts/check_skills.py            # all skills
python3 skills/writing-for-agents/scripts/check_skills.py clean-code # one skill
```

Reports, per skill: description chars, `SKILL.md` lines, directory total, broken pointers, orphan references, frontmatter problems, and whether the skill is vendored (from `.skill-lock.json`).

Exit codes: `0` clean, `1` on a defect — frontmatter error, name mismatch, broken pointer, or a description over its hard cap. Line-budget overruns and orphan references print as warnings and still exit `0`: a warning is a re-triage trigger, not a failure.

Vendored skills are reported and never failed on: their content is upstream's problem, and editing it in place loses the edit.
