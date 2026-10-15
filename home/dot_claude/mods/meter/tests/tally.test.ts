import { describe, expect, test } from 'claude-code/testing'

import { allocated, cacheHitPercent, familyOf, listCost } from '../hooks/prices'
import { addTurn, addTurnCache, familyShares, roleViews, sortedViews, spendPerHour } from '../hooks/tally'
import type { TurnRecord } from '../hooks/tally'
import { roundedCents } from './helpers'

const MILLION = 1_000_000

function turn(role: string, model: string, tokens: Partial<TurnRecord['tokens']>, isRespawn = false): TurnRecord {
  return {
    role,
    model,
    family: familyOf(model),
    tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, ...tokens },
    durationMs: 1000,
    isRun: role !== 'main',
    isRespawn,
  }
}

describe('prices', () => {
  test('names the family from any model id', () => {
    expect(familyOf('claude-opus-5-5')).toBe('opus')
    expect(familyOf('claude-sonnet-5-5')).toBe('sonnet')
    expect(familyOf('claude-haiku-5-5')).toBe('haiku')
    expect(familyOf('claude-fable-5-1')).toBe('fable')
    expect(familyOf('claude-mythos-5-1')).toBe('fable')
    expect(familyOf('gpt-something')).toBe('other')
  })

  test('prices each token kind at the list rate of the model, then of its family', () => {
    const input = { input: MILLION, output: 0, cacheRead: 0, cacheWrite: 0 }
    expect(listCost(input, 'claude-opus-5-5')).toBe(4)
    expect(listCost(input, 'claude-opus-5')).toBe(5)
    expect(listCost(input, 'claude-sonnet-4-6')).toBe(3)
    expect(listCost(input, 'some-new-opus-model')).toBe(4)
    expect(listCost({ input: 0, output: MILLION, cacheRead: 0, cacheWrite: 0 }, 'claude-sonnet-5-5')).toBe(10)
    expect(Math.round(listCost({ input: 0, output: 0, cacheRead: MILLION, cacheWrite: MILLION }, 'claude-haiku-5-5') * 1000)).toBe(135)
    expect(listCost({ input: 0, output: 0, cacheRead: MILLION, cacheWrite: 0 }, 'claude-fable-5')).toBe(1)
  })

  test('scales list estimates to the session total', () => {
    expect(allocated(1, 4, 8)).toBe(2)
    expect(allocated(1, 4, null)).toBe(1)
    expect(allocated(1, 0, 8)).toBe(1)
  })

  test('reads the cache hit share of input', () => {
    expect(cacheHitPercent({ input: 10, output: 99, cacheRead: 80, cacheWrite: 10 })).toBe(80)
    expect(cacheHitPercent({ input: 0, output: 5, cacheRead: 0, cacheWrite: 0 })).toBeNull()
  })
})

describe('role tallies', () => {
  test('adds turns per role and model, counting runs and re-spawns', () => {
    let roles = addTurn([], turn('main', 'claude-opus-5-5', { input: 100, output: 10 }))
    roles = addTurn(roles, turn('main', 'claude-opus-5-5', { input: 50 }))
    roles = addTurn(roles, turn('tester', 'claude-sonnet-5-5', { input: 10 }))
    roles = addTurn(roles, turn('tester', 'claude-sonnet-5-5', { input: 10 }, true))

    expect(roles).toHaveLength(2)
    expect(roles[0]?.runs).toBe(0)
    expect(roles[0]?.tokens.input).toBe(150)
    expect(roles[1]?.runs).toBe(2)
    expect(roles[1]?.respawns).toBe(1)
  })

  test('role costs add up to the session total and sort by cost or tokens', () => {
    let roles = addTurn([], turn('main', 'claude-opus-5-5', { output: 100_000 }))
    roles = addTurn(roles, turn('verifier', 'claude-haiku-5-5', { input: 900_000 }))
    const views = roleViews(roles, 3.5)

    expect(roundedCents(views.reduce((sum, view) => sum + view.usd, 0))).toBe(350)
    expect(sortedViews(views, 'cost')[0]?.role).toBe('main')
    expect(sortedViews(views, 'tokens')[0]?.role).toBe('verifier')
    expect(familyShares(views)[0]?.family).toBe('opus')
  })

  test('keeps the last 40 turn cache readings and skips a turn with no input', () => {
    let turns = addTurnCache([], { input: 0, output: 1, cacheRead: 0, cacheWrite: 0 })
    expect(turns).toHaveLength(0)
    for (let index = 0; index < 45; index++) {
      turns = addTurnCache(turns, { input: 1, output: 0, cacheRead: 9, cacheWrite: 0 })
    }
    expect(turns).toHaveLength(40)
    expect(turns[0]?.hitPercent).toBe(90)
  })

  test('has no spend rate in the first minute', () => {
    expect(spendPerHour(1, 0, 30_000)).toBeNull()
    expect(spendPerHour(2, 0, 1_800_000)).toBe(4)
  })
})
