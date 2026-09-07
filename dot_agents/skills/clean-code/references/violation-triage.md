# Violation Triage

Fixing what already exists: the symptom you found, the cause to fix, and how to move without breaking callers.

## Symptom → root-cause fix

| Found | Fix |
|---|---|
| Any pattern in the SKILL.md **Banned outright** table | Delete it. "Public API", "convention", "the linter asked" are not exemptions |
| Comment contradicts the code | One is stale. Fix the bug or delete the lie. Intent genuinely unclear → ask |
| Comment carries a real outside fact but rambles, or is over budget (>1 inline / >2 doc / >5 header) | Keep the fact, cut to one line, delete the rest. Nothing load-bearing → delete whole |
| Comment exists because the code is hard to follow | Fix the CODE — rename, extract, flatten. Then delete the comment |
| Design narration or layering essay worth keeping | Delete from code, tell the user, propose the design doc |
| Dead code, unused export, unreachable branch | Delete |
| Vague name, magic number, if-pyramid | Rename to intent, name the constant, invert into guard clauses |
| Duplicated logic | Extract one shared function, replace ALL call sites |
| Bug inside duplicated logic | Extract first, then fix once — otherwise you must fix every copy |
| Tangled multi-job function | Split it, or isolate the new case cleanly — never bolt on "one more special case" |
| Flag or wrapper added to dodge a bad signature | Fix the signature |
| Speculative abstraction with a single user | Collapse it back to the concrete case |

## Refactor safely

- Existing tests stay green; every caller of a changed signature updated
- Moved logic with branches or money/security impact and no test covering it → add a small test first ([test-quality.md](test-quality.md))
- Keep refactor and behavior change in separate steps, so a failure points at one cause
- Large or risky → propose it as its own change, never a drive-by inside a feature or bugfix
