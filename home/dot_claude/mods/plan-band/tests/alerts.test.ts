import { describe, expect, test } from 'claude-code/testing'

import type { AlertSnapshot, LimitsView } from '../types'
import { alertsBetween, donePartsOf } from '../hooks/alerts'
import { parsePhaseOutline } from '../hooks/plan'
import { PHASE_FILE } from './fixtures'

const QUIET: AlertSnapshot = { chip: 'running', doneParts: ['11.1'], shippedPhases: [10], pace: 'on-pace' }
const CONTEXT = { limits: null, status: null, ledger: null, isAutoResumeOn: true }

describe('alertsBetween', () => {
  test('stays silent on the first snapshot and when nothing changed', async () => {
    expect(alertsBetween(null, QUIET, CONTEXT)).toEqual([])
    expect(alertsBetween(QUIET, QUIET, CONTEXT)).toEqual([])
  })

  test('tells a finished part and a shipped phase once', async () => {
    const next = { ...QUIET, doneParts: ['11.1', '11.2'], shippedPhases: [10, 11] }
    expect(alertsBetween(QUIET, next, CONTEXT).map(alert => alert.title)).toEqual(['Part 11.2 done', 'Phase 11 shipped'])
  })

  test('tells when the pace gets worse, not when it gets better', async () => {
    const limits: LimitsView = {
      computedAt: 0,
      windows: [
        {
          kind: 'five_hour',
          percent: 62,
          resetsAt: 0,
          windowMs: 1,
          samples: [],
          perHour: 36,
          fullAt: new Date(2026, 9, 12, 12, 45).getTime(),
          pace: 'ease-off',
        },
      ],
    }
    const worse = { ...QUIET, pace: 'ease-off' as const }
    expect(alertsBetween(QUIET, worse, { ...CONTEXT, limits })).toEqual([
      { title: 'Ease off', text: '5h limit full by ~12:45 at this pace.' },
    ])
    expect(alertsBetween(worse, QUIET, { ...CONTEXT, limits })).toEqual([])
  })

  test('tells a pause, a question and a stopped run', async () => {
    expect(alertsBetween(QUIET, { ...QUIET, chip: 'paused', pace: 'paused' }, CONTEXT)[0]?.title).toBe('Plan paused')
    expect(alertsBetween(QUIET, { ...QUIET, chip: 'waiting' }, CONTEXT)[0]?.title).toBe('Waiting on you')
    expect(alertsBetween(QUIET, { ...QUIET, chip: 'stopped' }, CONTEXT)[0]?.title).toBe('Plan stopped')
    expect(alertsBetween(QUIET, { ...QUIET, chip: 'idle' }, CONTEXT)).toEqual([])
  })
})

describe('donePartsOf', () => {
  test('lists parts whose every task is done', async () => {
    expect(donePartsOf(parsePhaseOutline(PHASE_FILE))).toEqual([])
    expect(donePartsOf(parsePhaseOutline(PHASE_FILE.replace('- [ ] 3.3', '- [x] 3.3')))).toEqual(['11.1'])
  })

  test('never names the unnamed part of a phase with no part headings', async () => {
    expect(donePartsOf(parsePhaseOutline('# Phase 1: Measure\n\n## Tasks\n\n- [x] Task 1: Views\n  - [x] 1.1: Areas\n'))).toEqual([])
  })
})
