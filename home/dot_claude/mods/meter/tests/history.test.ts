import { describe, expect, test } from 'claude-code/testing'

import type { StoredRole, StoredSession } from '../types'
import {
  EMPTY_HISTORY,
  daySpends,
  historyFrom,
  isForeignHistory,
  rangeDays,
  rangeStats,
  roleSummaries,
  sessionsOn,
  trials,
  upsertSession,
} from '../hooks/history'
import { dayKey } from '../hooks/text'
import { roundedCents } from './helpers'

const DAY_MS = 86_400_000
const NOW = new Date(2026, 9, 14, 15, 0).getTime()

function role(name: string, model: string, family: StoredRole['family'], runs: number, usd: number, respawns = 0): StoredRole {
  return { role: name, model, family, runs, respawns, durationMs: runs * 60_000, tokens: runs * 1000, cacheRead: 900, inputTotal: 1000, usd }
}

function session(id: string, daysAgo: number, roles: StoredRole[]): StoredSession {
  const startedAt = NOW - daysAgo * DAY_MS

  return { id, day: dayKey(startedAt), startedAt, usd: roles.reduce((sum, one) => sum + one.usd, 0), blocks: 1, roles }
}

describe('stored history', () => {
  test('keeps the valid sessions of a stored value and drops the rest', () => {
    const good = session('a', 0, [role('main', 'claude-opus-5-5', 'opus', 3, 2)])
    const history = upsertSession(EMPTY_HISTORY, good, NOW)
    expect(historyFrom(history)).toEqual(history)
    expect(historyFrom({ version: 2, sessions: [good] })).toEqual(EMPTY_HISTORY)
    expect(historyFrom(null)).toEqual(EMPTY_HISTORY)
    const mixed = {
      version: 1,
      sessions: [good, { id: 'x' }, session('b', 0, [{ ...role('x', 'm', 'opus', 1, 1), family: 'gpt' as never }]), session('c', 0, [role('evil\u001b[2J', 'm', 'opus', 1, 1)])],
    }
    expect(historyFrom(mixed).sessions.map(one => one.id)).toEqual(['a'])
    expect(isForeignHistory({ version: 2, sessions: [] })).toBe(true)
    expect(isForeignHistory(undefined)).toBe(false)
    expect(isForeignHistory(history)).toBe(false)
  })

  test('replaces a session by id and drops sessions past 30 days', () => {
    let history = upsertSession(EMPTY_HISTORY, session('old', 31, []), NOW - 31 * DAY_MS)
    history = upsertSession(history, session('a', 0, [role('main', 'm', 'opus', 1, 1)]), NOW)
    history = upsertSession(history, session('a', 0, [role('main', 'm', 'opus', 1, 5)]), NOW)

    expect(history.sessions.map(one => one.id)).toEqual(['a'])
    expect(history.sessions[0]?.usd).toBe(5)
  })
})

describe('ranges', () => {
  const history = [
    session('s1', 6, [role('main', 'claude-opus-5-5', 'opus', 4, 3), role('tester', 'claude-haiku-5-5', 'haiku', 6, 0.54, 4)]),
    session('s2', 2, [role('main', 'claude-opus-5-5', 'opus', 2, 2), role('tester', 'claude-sonnet-5-5', 'sonnet', 3, 0.9, 1)]),
    session('s3', 0, [role('main', 'claude-opus-5-5', 'opus', 2, 1), role('tester', 'claude-sonnet-5-5', 'sonnet', 3, 0.9)]),
  ]

  test('lists the days of a range, oldest first', () => {
    const days = rangeDays('7d', NOW)
    expect(days).toHaveLength(7)
    expect(days[6]).toBe(dayKey(NOW))
    expect(rangeDays('today', NOW)).toEqual([dayKey(NOW)])
  })

  test('sums spend per day by family', () => {
    const days = rangeDays('7d', NOW)
    const spends = daySpends(sessionsOn({ version: 1, sessions: history }, days), days)
    expect(roundedCents(spends[0]?.usd)).toBe(354)
    expect(roundedCents(spends[0]?.byFamily.haiku)).toBe(54)
    expect(spends[1]?.usd).toBe(0)
  })

  test('counts main runs by session and sorts roles by spend', () => {
    const days = rangeDays('7d', NOW)
    const summaries = roleSummaries(history, days)
    expect(summaries[0]?.role).toBe('main')
    expect(summaries[0]?.runs).toBe(3)
    expect(summaries[0]?.trend).toHaveLength(7)
    expect(summaries.find(one => one.model === 'claude-sonnet-5-5')?.runs).toBe(6)
  })

  test('compares models of one role only once each has enough runs', () => {
    const [trial] = trials(history)
    expect(trial?.role).toBe('tester')
    expect(trial?.models.map(model => model.family)).toEqual(['haiku', 'sonnet'])
    expect(trial?.isReady).toBe(true)
    expect(roundedCents(trial?.models[0]?.usdPerFinished)).toBe(27)
    expect(trials(history.slice(1))).toEqual([])
  })

  test('reports totals with mean and median per session', () => {
    const stats = rangeStats(history)
    expect(stats.sessions).toBe(3)
    expect(stats.runs).toBe(12)
    expect(roundedCents(stats.medianUsd)).toBe(290)
    expect(stats.blocks).toBe(3)
    expect(stats.cachePercent).toBe(90)
  })
})
