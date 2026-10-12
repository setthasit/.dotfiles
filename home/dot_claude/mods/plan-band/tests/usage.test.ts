import { describe, expect, test } from 'claude-code/testing'

import type { UsageHistory } from '../types'
import {
  addSample,
  axisSegments,
  chartCells,
  chartRows,
  duration,
  fullAtOf,
  isUsageHistory,
  limitWindowOf,
  paceOf,
  percentPerHour,
} from '../hooks/usage'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const RESET = 10 * HOUR
const NOW = RESET - 2 * HOUR

function historyOf(points: [number, number][]): UsageHistory {
  return { kind: 'five_hour', resetsAt: RESET, samples: points.map(([at, percent]) => ({ at, percent })) }
}

describe('addSample', () => {
  test('starts over when the window resets', async () => {
    const old = historyOf([[NOW - HOUR, 40]])
    expect(addSample(old, 'five_hour', RESET + 5 * HOUR, { at: NOW, percent: 2 }).samples).toEqual([{ at: NOW, percent: 2 }])
  })

  test('keeps the same history when nothing changed within five minutes', async () => {
    const history = historyOf([[NOW - MINUTE, 40]])
    expect(addSample(history, 'five_hour', RESET, { at: NOW, percent: 40 })).toBe(history)
  })

  test('adds a changed reading and a five-minute heartbeat', async () => {
    const history = historyOf([[NOW - 6 * MINUTE, 40]])
    expect(addSample(history, 'five_hour', RESET, { at: NOW, percent: 40 }).samples).toHaveLength(2)
    expect(addSample(history, 'five_hour', RESET, { at: NOW - 5 * MINUTE, percent: 41 }).samples).toHaveLength(2)
  })
})

describe('pace', () => {
  test('measures the rise over the last 30 minutes', async () => {
    const samples = historyOf([
      [NOW - 60 * MINUTE, 30],
      [NOW - 30 * MINUTE, 44],
      [NOW, 62],
    ]).samples
    expect(percentPerHour(samples, NOW)).toBe(36)
  })

  test('has no pace before five minutes of history', async () => {
    expect(percentPerHour(historyOf([[NOW - MINUTE, 10], [NOW, 12]]).samples, NOW)).toBe(null)
  })

  test('projects when the window fills', async () => {
    expect(fullAtOf(62, 36, NOW)).toBe(NOW + (38 / 36) * HOUR)
    expect(fullAtOf(62, 0, NOW)).toBe(null)
    expect(fullAtOf(100, 36, NOW)).toBe(null)
  })

  test('names the pace against the reset', async () => {
    expect(paceOf(62, NOW + HOUR, RESET, NOW)).toBe('ease-off')
    expect(paceOf(62, NOW + 20 * MINUTE, RESET, NOW)).toBe('slow-down')
    expect(paceOf(62, RESET + MINUTE, RESET, NOW)).toBe('on-pace')
    expect(paceOf(62, null, RESET, NOW)).toBe('on-pace')
    expect(paceOf(91, null, RESET, NOW)).toBe('slow-down')
    expect(paceOf(100, null, RESET, NOW)).toBe('paused')
  })

  test('ignores a window kind it cannot chart', async () => {
    expect(limitWindowOf({ ...historyOf([[NOW, 5]]), kind: 'spend_limit' }, 5, NOW)).toBe(null)
  })
})

describe('isUsageHistory', () => {
  test('accepts a stored history and refuses anything else', async () => {
    expect(isUsageHistory(historyOf([[NOW, 5]]))).toBe(true)
    expect(isUsageHistory({ kind: 'five_hour', resetsAt: '10', samples: [] })).toBe(false)
    expect(isUsageHistory({ kind: 'five_hour', resetsAt: 10, samples: [{ at: 'x', percent: 1 }] })).toBe(false)
    expect(isUsageHistory(null)).toBe(false)
  })
})

describe('chart', () => {
  const history = historyOf([
    [RESET - 5 * HOUR, 0],
    [NOW - 30 * MINUTE, 44],
    [NOW, 62],
  ])
  const window = limitWindowOf(history, 62, NOW)

  test('draws used time, the projection and the time paused before the reset', async () => {
    expect(window).not.toBe(null)
    if (window === null) {
      return
    }
    const kinds = chartCells(window, NOW, 10).map(cell => cell.kind)
    expect(kinds.slice(0, 6)).toEqual(['used', 'used', 'used', 'used', 'used', 'used'])
    expect(kinds).toContain('projected')
    expect(kinds.at(-1)).toBe('over')
  })

  test('groups each row into colored runs', async () => {
    const rows = chartRows(
      [
        { value: 100, kind: 'used' },
        { value: 50, kind: 'used' },
        { value: 100, kind: 'over' },
      ],
      2,
    )
    expect(rows[0]).toEqual([
      { text: '█ ', kind: 'used' },
      { text: '█', kind: 'over' },
    ])
    expect(rows[1]).toEqual([
      { text: '██', kind: 'used' },
      { text: '█', kind: 'over' },
    ])
  })
})

describe('axisSegments', () => {
  test('places labels by column and drops one that would touch another', async () => {
    const segments = axisSegments(
      [
        { column: 0, text: '09:00', isEmphasized: false },
        { column: 4, text: 'clash', isEmphasized: false },
        { column: 8, text: 'full', isEmphasized: true },
      ],
      14,
    )
    expect(segments).toEqual([
      { text: '09:00   ', isEmphasized: false },
      { text: 'full', isEmphasized: true },
      { text: '  ', isEmphasized: false },
    ])
  })
})

test('pulls a label that would run past the end back inside the axis', async () => {
  expect(axisSegments([{ column: 8, text: 'full', isEmphasized: true }], 10)).toEqual([
    { text: '      ', isEmphasized: false },
    { text: 'full', isEmphasized: true },
  ])
})

describe('duration', () => {
  test('reads as minutes, hours or days', async () => {
    expect(duration(18 * MINUTE)).toBe('18m')
    expect(duration(138 * MINUTE)).toBe('2h 18m')
    expect(duration(3 * 24 * HOUR + 2 * HOUR)).toBe('3d 2h')
  })
})
