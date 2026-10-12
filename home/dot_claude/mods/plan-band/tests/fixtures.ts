export const STATUS_OUTPUT = `phase 10  phase-10-companies-and-modes.md  shipped  17/17  part 10.1 6/6  part 10.2 5/5  part 10.3 6/6
phase 11  phase-11-dedicated-server.md  open  6/13  part 11.1 6/6  part 11.2 0/6  part 11.3 0/1
phase 12  phase-12-steam-lobby.md  outline
current: phase 11  phase-11-dedicated-server.md
state: run-part
branch: feat/dedicated-server
part: 11.2  0/6  ends after 6.2, then handoff
ready: 4.1 6.1 6.2
batch: 4.1 6.1 6.2
attention:
  - lint: 26 error(s): run \`plan_check.py lint\` and fix the plan first
`

export const PHASE_FILE = `# Phase 11: Dedicated Server

## Context
- [ ] 9.9: Not a task, outside the Tasks section

## Tasks

### Part 11.1: A headless world with offline rules
Ends with: offline rules hold

- [x] Task 3: The dedicated server
  - [x] 3.2: Start, step, catch-up and autosave
  - [ ] 3.3: Admin console and the headless entry point

### Part 11.2: Four bots for two hours

- [ ] Task 4: Soak evidence
  - [ ] 4.1: Soak lines on the server and the client

## Implementation Details

#### 3.3: Admin console and the headless entry point
`

export const LEDGER_DURING_FIX = `## Run - phases 9-10 - started
## Found - privacy - an older phase's finding - not fixed
## Run - phases 9-10 - finished
## Run - phases 11-16 - started
## Phase started - phase 11 - branch feat/dedicated-server
## Found - flaky test - a test waits 2000 ms - pre-existing, not fixed
## Found - flaky test (update) - confirmed pre-existing
## Found - flaky test - fixed out of plan in 9bb0769 (WAIT_LIMIT_MSEC 10000)
## 11/3.2 writer report round 1
COMPLETE.
## Verification - 11/3.2
PASS. run_tests exit 0, \`1610 passed, 0 failed\`
## Decision - 11/3.2 round 1
Score: 86, FIX.
## 11/3.2 writer report fix round 1
done
## Decision - 11/3.2 fix round 1
Score: 94, FIX.
## Decision - 11/3.2 fix round 2
Score: 96/100, PASS
## 11/3.2 - done - 871645d
Score: 96/100. Decision: PASS.
## Found - security (availability) - \`src/net/session.gd:246-247\` has no cap on unseated peers per address; a client can hold every slot
## Next - 11/3.3
## 11/3.3 writer report round 1
COMPLETE.
## Verification - 11/3.3
PASS. run_tests exit 0, \`1622 passed, 0 failed\`, 0 Parse Error
## Task review - 11/3.3 round 1
PASS.
## Tester - 11/3.3 round 1
FAIL on coverage only
## Found - spec gap - the dedicated server ends on Ctrl-C without saving; play is lost
## Decision - 11/3.3 round 1
Score: 94, FIX. Deductions: T33-1 minor -3
`
