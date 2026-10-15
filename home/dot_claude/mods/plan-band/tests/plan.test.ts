import { describe, expect, test } from 'claude-code/testing'

import { layoutOf } from '../hooks/band'
import { chipOf } from '../hooks/chip'
import { barCells, currentStepOf, findingKinds, shortPath } from '../hooks/pieces'
import {
  findPlanDirInCommand,
  latestStartedPhase,
  mentionedPaths,
  parseLedger,
  parsePhaseOutline,
  parseStatus,
  phaseFileFor,
} from '../hooks/plan'
import { LEDGER_DURING_FIX, PHASE_FILE, STATUS_OUTPUT } from './fixtures'

const STATUS_SCRIPT = 'python3 ~/.agents/skills/implementation-plan-creator/scripts/plan_check.py'

describe('findPlanDirInCommand', () => {
  test('reads the plan dir of a status call', async () => {
    expect(findPlanDirInCommand(`${STATUS_SCRIPT} status document/still-got-it-demo/`)).toEqual({
      dir: 'document/still-got-it-demo',
      cdDir: null,
    })
  })

  test('reads a quoted dir and a leading cd', async () => {
    expect(findPlanDirInCommand(`cd "/repo root" && ${STATUS_SCRIPT} status '.plans/feature 1'`)).toEqual({
      dir: '.plans/feature 1',
      cdDir: '/repo root',
    })
  })

  test('ignores a lint call and unrelated commands', async () => {
    expect(findPlanDirInCommand(`${STATUS_SCRIPT} lint .plans/feature1`)).toBe(null)
    expect(findPlanDirInCommand('git status')).toBe(null)
  })
})

describe('mentionedPaths', () => {
  test('lists every @path in a prompt', async () => {
    const prompt = '/implement-plan-lead @document/still-got-it-demo/ please read @"docs/a b.md" and mail me@x'
    expect(mentionedPaths(prompt)).toEqual(['document/still-got-it-demo', 'docs/a b.md'])
  })
})

describe('parseStatus', () => {
  test('reads the current phase, state, branch, batch and attention lines', async () => {
    expect(parseStatus(STATUS_OUTPUT)).toEqual({
      phaseNumber: 11,
      phaseFile: 'phase-11-dedicated-server.md',
      state: 'run-part',
      branch: 'feat/dedicated-server',
      part: '11.2  0/6  ends after 6.2, then handoff',
      batch: ['4.1', '6.1', '6.2'],
      attention: ['lint: 26 error(s): run `plan_check.py lint` and fix the plan first'],
    })
  })

  test('reads a finished plan with no current phase', async () => {
    expect(parseStatus('phase 1  phase-1-x.md  shipped  3/3\nstate: done\n')?.phaseNumber).toBe(null)
  })

  test('refuses output with no state line', async () => {
    expect(parseStatus('Traceback (most recent call last):\n  File "plan_check.py"')).toBe(null)
  })
})

describe('parsePhaseOutline', () => {
  test('reads parts and leaves from the Tasks section only', async () => {
    expect(parsePhaseOutline(PHASE_FILE)).toEqual({
      number: 11,
      name: 'Dedicated Server',
      parts: [
        {
          id: '11.1',
          title: 'A headless world with offline rules',
          leaves: [
            { id: '3.2', title: 'Start, step, catch-up and autosave', isDone: true },
            { id: '3.3', title: 'Admin console and the headless entry point', isDone: false },
          ],
        },
        {
          id: '11.2',
          title: 'Four bots for two hours',
          leaves: [{ id: '4.1', title: 'Soak lines on the server and the client', isDone: false }],
        },
      ],
    })
  })

  test('refuses a file that is not a phase', async () => {
    expect(parsePhaseOutline('# Requirements\n')).toBe(null)
  })
})

describe('parseLedger', () => {
  const view = parseLedger(LEDGER_DURING_FIX, 11)

  test('keeps the open run', async () => {
    expect(view.run).toEqual({ from: 11, to: 16 })
  })

  test('scores a done task and counts its fix rounds', async () => {
    expect(view.done).toEqual([{ id: '3.2', hash: '871645d', score: 96, fixRounds: 2 }])
  })

  test('places the active task on its fix round', async () => {
    expect(view.active).toEqual({
      id: '3.3',
      rounds: [
        { fixNumber: 0, write: 'done', verify: 'done', review: 'done', score: 94, verdict: 'FIX' },
        { fixNumber: 1, write: 'todo', verify: 'todo', review: 'todo', score: null, verdict: null },
      ],
    })
  })

  test('reads the latest verification', async () => {
    expect(view.verification).toEqual({ isPass: true, passed: 1622, failed: 0 })
  })

  test('lists this phase findings without fix notes, follow-ups or older phases', async () => {
    expect(view.findings).toEqual([
      { kind: 'flaky test', summary: 'a test waits 2000 ms' },
      { kind: 'security', summary: '`src/net/session.gd:246-247` has no cap on unseated peers per address' },
      { kind: 'spec gap', summary: 'the dedicated server ends on Ctrl-C without saving' },
    ])
  })

  test('marks a failed verification', async () => {
    const failed = parseLedger(
      '## Phase started - phase 4\n## 4/1.1 writer report round 1\n## Verification - 4/1.1\nFAIL. `10 passed, 2 failed`\n',
      4,
    )
    expect(failed.active?.rounds[0]?.verify).toBe('failed')
    expect(failed.verification).toEqual({ isPass: false, passed: 10, failed: 2 })
  })

  test('marks the review step of a mechanical check', async () => {
    const checked = parseLedger('## Phase started - phase 4\n## 4/1.1 writer report\n## Mechanical check - 4/1.1\nPASS\n', 4)
    expect(checked.active?.rounds[0]?.review).toBe('done')
  })

  test('fails the review of a blocked round and opens the next fix round', async () => {
    const blocked = parseLedger(
      '## Phase started - phase 4\n## 4/1.1 writer report\n## Verification - 4/1.1\nPASS. `10 passed, 0 failed`\n## Task review - 4/1.1\nFAIL\n## Decision - 4/1.1\nScore: N/A. Decision: BLOCKED. Gates: S1 missing ownership check\n',
      4,
    )
    expect(blocked.active?.rounds).toEqual([
      { fixNumber: 0, write: 'done', verify: 'done', review: 'failed', score: null, verdict: null },
      { fixNumber: 1, write: 'todo', verify: 'todo', review: 'todo', score: null, verdict: null },
    ])
  })

  test('reads the decision word over an earlier verdict word in the body', async () => {
    const decided = parseLedger('## Phase started - phase 4\n## Decision - 4/1.1\nScore: 97. Prior FIX resolved. Decision: PASS\n', 4)
    expect(decided.active?.rounds[0]?.verdict).toBe('PASS')
  })

  test('starts a named task that has no report yet on its first step', async () => {
    const named = parseLedger('## Phase started - phase 11\n## Handoff - part 11.1 done - next: 11/4.1\n', 11)
    expect(named.active).toEqual({
      id: '4.1',
      rounds: [{ fixNumber: 0, write: 'todo', verify: 'todo', review: 'todo', score: null, verdict: null }],
    })
  })

  test('has no task without a phase number', async () => {
    expect(parseLedger(LEDGER_DURING_FIX, null).active).toBe(null)
  })

  test('finds the latest started phase', async () => {
    expect(latestStartedPhase(LEDGER_DURING_FIX)).toBe(11)
  })
})

describe('printable', () => {
  test('drops terminal control sequences from ledger text', async () => {
    const view = parseLedger('## Phase started - phase 2\n## Found - security - a \u001b[2Jcleared\u0007 screen\n', 2)
    expect(view.findings[0]?.summary).toBe('a [2Jcleared screen')
  })
})

describe('phaseFileFor', () => {
  test('picks the file of one phase, not a longer number', async () => {
    const names = ['phase-1-content.md', 'phase-11-dedicated-server.md', 'progress.md']
    expect(phaseFileFor(1, names)).toBe('phase-1-content.md')
    expect(phaseFileFor(11, names)).toBe('phase-11-dedicated-server.md')
    expect(phaseFileFor(12, names)).toBe(null)
  })
})

describe('band helpers', () => {
  test('puts the fix round on its first step, then commit after a pass', async () => {
    const round = { fixNumber: 1, write: 'todo', verify: 'todo', review: 'todo', score: null, verdict: null } as const
    expect(currentStepOf(round)).toBe('write')
    expect(currentStepOf({ ...round, write: 'done', verify: 'done', review: 'done', score: 96, verdict: 'PASS' })).toBe('commit')
  })

  test('scales a bar to a fixed width', async () => {
    expect(barCells(6, 13, 12)).toEqual({ filled: 6, empty: 6 })
    expect(barCells(20, 40, 12)).toEqual({ filled: 6, empty: 6 })
    expect(barCells(50, 40, 12)).toEqual({ filled: 12, empty: 0 })
    expect(barCells(0, 0, 12)).toEqual({ filled: 0, empty: 12 })
  })

  test('shortens a deep plan path to its last two folders', async () => {
    expect(shortPath('/Users/me/Development/game/document/demo')).toBe('…/document/demo')
    expect(shortPath('/work/demo')).toBe('/work/demo')
  })

  test('lists the three most common finding kinds, then a count of the rest', async () => {
    const kinds = ['security', 'security', 'flaky test', 'flaky test', 'flaky test', 'text', 'tooling', 'data loss']
    const ledger = parseLedger(LEDGER_DURING_FIX, 11)
    const findings = kinds.map(kind => ({ kind, summary: 'x' }))

    expect(findingKinds({ ...ledger, findings })).toBe('3 flaky test · 2 security · 1 text · +2 more')
    expect(findingKinds({ ...ledger, findings: findings.slice(0, 2) })).toBe('2 security')
  })

  test('picks a layout by width', async () => {
    expect(layoutOf(200, 20)).toBe('wide')
    expect(layoutOf(120, 20)).toBe('medium')
    expect(layoutOf(90, 20)).toBe('narrow')
    expect(layoutOf(200, 6)).toBe('narrow')
  })

  test('shows running over a question while agents work, and idle when nothing runs', async () => {
    const asking = parseStatus('state: ask-branch\n')
    const quiet = { ledger: null, agents: [], limits: null, isWorking: false, isSettling: false }
    expect(chipOf({ ...quiet, status: asking, isWorking: true }).label).toBe('● RUNNING')
    expect(chipOf({ ...quiet, status: asking }).label).toBe('◆ WAITING ON YOU')
    expect(chipOf({ ...quiet, status: null }).label).toBe('◌ IDLE')
    const openRun = parseLedger(LEDGER_DURING_FIX, 11)
    expect(chipOf({ ...quiet, status: null, ledger: openRun }).label).toBe('✕ STOPPED')
    expect(chipOf({ ...quiet, status: null, ledger: openRun, isSettling: true }).label).toBe('◌ IDLE')
  })
})
