# Feedback Loops

Reached from Phase 1 when the cheap techniques do not fit the bug. Each entry: when it is the right one, the command or API, and the failure mode that makes it lie to you.

**Failing test in the repo's own runner**
Right when the bug lives in code the suite already reaches; cheapest because the fixture and the assertion already exist.
`go test -run TestSplitOrder ./internal/orders` · `pytest -x tests/test_orders.py::test_split` · `vitest run src/orders.test.ts -t split`
Fails when the fixture stubs the thing that is broken: green test, broken production. If the fixture replaces the suspect boundary, it cannot be the loop.

**Direct HTTP request**
Right when the symptom is a status code, a body, or a header — the whole stack under one call.
`bash`: `curl -sS -i -X POST localhost:8080/orders -d @payload.json`. Server needs to stay up across experiments → `hub` `op:"start"` with `ready.port`, then `hub` `op:"logs"` per run.
Fails on state accumulation: run 2 hits a row run 1 created. Reset the state per run or make the payload unique.

**CLI output diff**
Right when the symptom is wrong stdout, a wrong exit code, or a wrongly written file.
`bash`: `mytool build fixtures/case.yml > /tmp/got 2>&1; diff -u fixtures/expected /tmp/got; echo $?`
Fails on nondeterministic output — timestamps, paths, ordering, ids. Normalise those with `sed` before diffing, or the loop is red every run and tells you nothing.

**Headless browser**
Right when the symptom exists only after render: client JS, hydration, layout, an authenticated flow.
`eval`: `const tab = await browser.open({ name: "repro", url })`, then `tab.observe()`, `tab.click()`, `tab.evaluate()`, `tab.screenshot()`; `tab.close()` at the end.
Fails on timing — asserting before the app settles. Use `tab.waitFor` / `waitForSelector`, never a sleep, or the flake is yours and not the app's.

**Log or trace replay**
Right when production failed once and you hold the record but not the trigger.
`grep` the captured log for the request id, extract the payload, then feed that exact payload back through the handler (the HTTP row, or a harness calling the handler directly).
Fails when the record is incomplete: missing headers, truncated body, absent upstream state. A replay that goes green proves only that the record was lossy.

**Throwaway harness script**
Right when no seam reaches the suspect unit and you need one now — the fastest way to hold one function under a microscope.
`write /tmp/repro.<ext>` importing the real module, calling the suspect unit with the minimised input, printing the value; run it with `bash`.
Fails by drifting from real call-site conditions — different config, different init order, mocked collaborators. That the harness is needed at all is a Phase 5 seam finding.

**Property or fuzz search**
Right when the trigger input is unknown: "fails for some users", encoding bugs, boundary arithmetic, parser bugs.
Loop generated inputs against the invariant (`hypothesis` in Python, `go test -fuzz=Fuzz`, or a plain seeded random loop in `eval`), and print the first failing input.
Fails by finding a *different* bug than the reported one, and by finding inputs the system never receives. Check the counterexample against the reported symptom before believing it.

**`git bisect`**
Right when it demonstrably worked at a known-good commit and the red command runs unchanged at both ends.
`bash`: `git bisect start <bad> <good>` then `git bisect run bash -c '<red command>'`; `git bisect reset` when done.
Fails when the red command does not exist at old commits (build changes, dep changes, moved files) — then bisect scores build failures as bug hits. Confirm red at `<bad>` and green at `<good>` first. Never bisect a dirty tree.

**Differential comparison**
Right for "works on my machine", one environment, one version, or one tenant only.
Run the identical input against the known-good side — previous release, other env, reference implementation — and diff the outputs, then the inputs: config, versions (`diff <(pip freeze)`, lockfiles), locale, timezone, data.
Fails by drowning in irrelevant differences. Diff narrowly and stop at the first difference the minimised repro depends on.

## Human-in-the-loop

Last resort. Only when the loop needs a human to do something no tool can drive: a hardware device, a vendor dashboard toggle, an SSO consent screen outside your reach, a physical card. Everything above is faster; exhaust it first.

| Rule | Detail |
|---|---|
| Derive the input list, never ask for it | `read` `.env.example`, README, `docker-compose*.y*ml`; `grep` `secrets\.[A-Za-z_]+` and `vars\.[A-Za-z_]+` across `.github/workflows/`. That set is what the script must collect. Never open `.env`. Never ask the user to remember the list |
| Never run it yourself | It blocks on stdin and hangs the session. Verify with `bash -n script.sh`, `shellcheck script.sh` when installed, and a read-through against the derived list |
| Hand-off is parseable | The script's last block prints `KEY=VALUE` lines, one per capture, for you to parse |
| No echo | Captured values are read with the terminal echo off and never printed mid-run |

Template: `assets/hitl-loop.sh`. Copy it, edit the stage / `step` / `capture` lines to this bug, hand the path to the user; do not write one from scratch.

Values come back containing credentials. Parse them, use them, and redact them in everything you write.
