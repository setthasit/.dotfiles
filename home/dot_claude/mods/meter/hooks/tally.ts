import type { CostSort, Family, LiveAgent, RoleTally, TokenCounts, TurnCache } from '../types'
import { NO_TOKENS, addCounts, allTokens, allocated, cacheHitPercent, listCost } from './prices'

export type RoleView = RoleTally & { usd: number; cachePercent: number | null }

export type FamilyShare = { family: Family; usd: number; share: number }

export type TurnRecord = {
  role: string
  model: string
  family: Family
  tokens: TokenCounts
  durationMs: number
  isRun: boolean
  isRespawn: boolean
}

export const MAIN_ROLE = 'main'
const MAX_TURNS = 40
const HOUR_MS = 3_600_000
const MIN_RATE_MS = 60_000

function sameRole(tally: RoleTally, role: string, model: string): boolean {
  return tally.role === role && tally.model === model
}

export function addTurn(roles: RoleTally[], turn: TurnRecord): RoleTally[] {
  const existing = roles.find(tally => sameRole(tally, turn.role, turn.model))
  const base: RoleTally = existing ?? {
    role: turn.role,
    model: turn.model,
    family: turn.family,
    runs: 0,
    respawns: 0,
    durationMs: 0,
    tokens: NO_TOKENS,
    listUsd: 0,
  }
  const tokens = addCounts(base.tokens, turn.tokens)
  const updated: RoleTally = {
    ...base,
    runs: base.runs + (turn.isRun ? 1 : 0),
    respawns: base.respawns + (turn.isRespawn ? 1 : 0),
    durationMs: base.durationMs + turn.durationMs,
    tokens,
    listUsd: listCost(tokens, base.model),
  }

  return existing === undefined ? [...roles, updated] : roles.map(tally => (tally === existing ? updated : tally))
}

export function addTurnCache(turns: TurnCache[], tokens: TokenCounts): TurnCache[] {
  const hit = cacheHitPercent(tokens)
  if (hit === null) {
    return turns
  }

  return [...turns, { hitPercent: hit, cacheWrite: tokens.cacheWrite }].slice(-MAX_TURNS)
}

export function totalTokens(roles: RoleTally[]): TokenCounts {
  return roles.reduce((sum, tally) => addCounts(sum, tally.tokens), NO_TOKENS)
}

export function roleViews(roles: RoleTally[], sessionUsd: number | null): RoleView[] {
  const totalList = roles.reduce((sum, tally) => sum + tally.listUsd, 0)

  return roles.map(tally => ({
    ...tally,
    usd: allocated(tally.listUsd, totalList, sessionUsd),
    cachePercent: cacheHitPercent(tally.tokens),
  }))
}

export function nextSort(sort: CostSort): CostSort {
  return sort === 'cost' ? 'tokens' : 'cost'
}

export function sortedViews(views: RoleView[], sort: CostSort): RoleView[] {
  const key = (view: RoleView) => (sort === 'cost' ? view.usd : allTokens(view.tokens))

  return [...views].sort((a, b) => key(b) - key(a))
}

export function familyShares(views: { family: Family; usd: number }[]): FamilyShare[] {
  const total = views.reduce((sum, view) => sum + view.usd, 0)
  const byFamily = new Map<Family, number>()
  for (const view of views) {
    byFamily.set(view.family, (byFamily.get(view.family) ?? 0) + view.usd)
  }

  return [...byFamily.entries()]
    .map(([family, amount]) => ({ family, usd: amount, share: total === 0 ? 0 : amount / total }))
    .sort((a, b) => b.usd - a.usd)
}

export function withoutAgent(live: LiveAgent[], id: string): LiveAgent[] {
  return live.filter(agent => agent.id !== id)
}

export function spendPerHour(usdSpent: number, startedAt: number, now: number): number | null {
  const elapsed = now - startedAt

  return elapsed < MIN_RATE_MS ? null : usdSpent / (elapsed / HOUR_MS)
}
