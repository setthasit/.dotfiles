import type { Family, HistoryRange, StoredHistory, StoredRole, StoredSession } from '../types'
import { allTokens, inputTotal } from './prices'
import type { RoleView } from './tally'
import { MAIN_ROLE } from './tally'
import { clipped, dayKey, printable } from './text'

export type DaySpend = { day: string; usd: number; byFamily: Partial<Record<Family, number>> }

export type RoleSummary = {
  role: string
  model: string
  family: Family
  runs: number
  tokensPerRun: number
  msPerRun: number
  cachePercent: number | null
  usdPerRun: number
  usd: number
  trend: number[]
}

export type TrialModel = {
  model: string
  family: Family
  firstDay: string
  lastDay: string
  runs: number
  usdPerRun: number
  usdPerFinished: number
  msPerRun: number
  respawns: number
}

export type Trial = { role: string; models: TrialModel[]; isReady: boolean }

export type RangeStats = { usd: number; sessions: number; runs: number; meanUsd: number; medianUsd: number; cachePercent: number | null; blocks: number }

export const EMPTY_HISTORY: StoredHistory = { version: 1, sessions: [] }
export const TRIAL_MIN_RUNS = 5
const KEEP_DAYS = 30
const MAX_SESSIONS = 2000
const DAY_MS = 86_400_000
const RANGE_DAYS: Record<HistoryRange, number> = { today: 1, '7d': 7, '30d': 30 }
const FAMILIES = new Set<string>(['opus', 'sonnet', 'haiku', 'fable', 'other'])
const MAX_STORED_TEXT = 120
const RANGE_ORDER: HistoryRange[] = ['today', '7d', '30d']

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isCleanText(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_STORED_TEXT && printable(value) === value
}

function isStoredRole(value: unknown): value is StoredRole {
  if (!isRecord(value)) {
    return false
  }
  const numbers = [value.runs, value.respawns, value.durationMs, value.tokens, value.cacheRead, value.inputTotal, value.usd]

  return (
    isCleanText(value.role) &&
    isCleanText(value.model) &&
    typeof value.family === 'string' &&
    FAMILIES.has(value.family) &&
    numbers.every(isFiniteNumber)
  )
}

function isStoredSession(value: unknown): value is StoredSession {
  return (
    isRecord(value) &&
    isCleanText(value.id) &&
    isCleanText(value.day) &&
    isFiniteNumber(value.startedAt) &&
    isFiniteNumber(value.usd) &&
    isFiniteNumber(value.blocks) &&
    Array.isArray(value.roles) &&
    value.roles.every(isStoredRole)
  )
}

export function isForeignHistory(value: unknown): boolean {
  return value !== undefined && !(isRecord(value) && value.version === 1)
}

export function historyFrom(value: unknown): StoredHistory {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.sessions)) {
    return EMPTY_HISTORY
  }

  return { version: 1, sessions: value.sessions.filter(isStoredSession) }
}

export function storedRoles(views: RoleView[]): StoredRole[] {
  return views.map(view => ({
    role: clipped(printable(view.role), MAX_STORED_TEXT),
    model: clipped(printable(view.model), MAX_STORED_TEXT),
    family: view.family,
    runs: view.runs,
    respawns: view.respawns,
    durationMs: view.durationMs,
    tokens: allTokens(view.tokens),
    cacheRead: view.tokens.cacheRead,
    inputTotal: inputTotal(view.tokens),
    usd: view.usd,
  }))
}

export function upsertSession(history: StoredHistory, session: StoredSession, now: number): StoredHistory {
  const oldest = now - KEEP_DAYS * DAY_MS
  const kept = history.sessions.filter(stored => stored.id !== session.id && stored.startedAt >= oldest)

  return { version: 1, sessions: [...kept, session].slice(-MAX_SESSIONS) }
}

export function rangeDays(range: HistoryRange, now: number): string[] {
  const count = RANGE_DAYS[range]
  const today = new Date(now)

  return Array.from({ length: count }, (_, index) =>
    dayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - (count - 1 - index)).getTime()),
  )
}

export function sessionsOn(history: StoredHistory, days: string[]): StoredSession[] {
  const wanted = new Set(days)

  return history.sessions.filter(session => wanted.has(session.day))
}

export function daySpends(sessions: StoredSession[], days: string[]): DaySpend[] {
  return days.map(day => {
    const byFamily: Partial<Record<Family, number>> = {}
    let usd = 0
    for (const session of sessions.filter(one => one.day === day)) {
      for (const role of session.roles) {
        byFamily[role.family] = (byFamily[role.family] ?? 0) + role.usd
        usd += role.usd
      }
    }

    return { day, usd, byFamily }
  })
}

function roleKey(role: StoredRole): string {
  return `${role.role}\u0000${role.model}`
}

type RoleGroup = { first: StoredRole; entries: { day: string; role: StoredRole }[] }

function groupRoles(sessions: StoredSession[]): RoleGroup[] {
  const groups = new Map<string, RoleGroup>()
  for (const session of sessions) {
    for (const role of session.roles) {
      const group = groups.get(roleKey(role)) ?? { first: role, entries: [] }
      group.entries.push({ day: session.day, role })
      groups.set(roleKey(role), group)
    }
  }

  return [...groups.values()]
}

export function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function runsOf(group: RoleGroup): number {
  const isMain = group.first.role === MAIN_ROLE

  return isMain ? group.entries.length : sum(group.entries.map(entry => entry.role.runs))
}

export function roleSummaries(sessions: StoredSession[], days: string[]): RoleSummary[] {
  return groupRoles(sessions)
    .map(group => {
      const roles = group.entries.map(entry => entry.role)
      const runCount = runsOf(group)
      const runs = Math.max(1, runCount)
      const usd = sum(roles.map(role => role.usd))
      const input = sum(roles.map(role => role.inputTotal))

      return {
        role: group.first.role,
        model: group.first.model,
        family: group.first.family,
        runs: runCount,
        tokensPerRun: sum(roles.map(role => role.tokens)) / runs,
        msPerRun: sum(roles.map(role => role.durationMs)) / runs,
        cachePercent: input === 0 ? null : (sum(roles.map(role => role.cacheRead)) / input) * 100,
        usdPerRun: usd / runs,
        usd,
        trend: days.map(day => sum(group.entries.filter(entry => entry.day === day).map(entry => entry.role.usd))),
      }
    })
    .sort((a, b) => b.usd - a.usd)
}

function trialModel(group: RoleGroup): TrialModel {
  const roles = group.entries.map(entry => entry.role)
  const runs = sum(roles.map(role => role.runs))
  const respawns = sum(roles.map(role => role.respawns))
  const usd = sum(roles.map(role => role.usd))
  const days = group.entries.map(entry => entry.day).sort()

  return {
    model: group.first.model,
    family: group.first.family,
    firstDay: days[0] ?? '',
    lastDay: days[days.length - 1] ?? '',
    runs,
    usdPerRun: usd / Math.max(1, runs),
    usdPerFinished: usd / Math.max(1, runs - respawns),
    msPerRun: sum(roles.map(role => role.durationMs)) / Math.max(1, runs),
    respawns,
  }
}

export function trials(sessions: StoredSession[]): Trial[] {
  const byRole = new Map<string, RoleGroup[]>()
  for (const group of groupRoles(sessions)) {
    if (group.first.role === MAIN_ROLE) {
      continue
    }
    byRole.set(group.first.role, [...(byRole.get(group.first.role) ?? []), group])
  }

  return [...byRole.entries()]
    .filter(([, groups]) => groups.length > 1)
    .map(([role, groups]) => {
      const models = groups.map(trialModel).sort((a, b) => a.firstDay.localeCompare(b.firstDay))

      return { role, models, isReady: models.every(model => model.runs >= TRIAL_MIN_RUNS) }
    })
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0
  }
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  const upper = sorted[middle] ?? 0
  const lower = sorted[middle - 1] ?? upper

  return sorted.length % 2 === 1 ? upper : (lower + upper) / 2
}

export function rangeStats(sessions: StoredSession[]): RangeStats {
  const roles = sessions.flatMap(session => session.roles)
  const input = sum(roles.map(role => role.inputTotal))
  const totals = sessions.map(session => session.usd)
  const usd = sum(totals)

  return {
    usd,
    sessions: sessions.length,
    runs: sum(roles.filter(role => role.role !== MAIN_ROLE).map(role => role.runs)),
    meanUsd: sessions.length === 0 ? 0 : usd / sessions.length,
    medianUsd: median(totals),
    cachePercent: input === 0 ? null : (sum(roles.map(role => role.cacheRead)) / input) * 100,
    blocks: sum(sessions.map(session => session.blocks)),
  }
}

export function nextRange(range: HistoryRange): HistoryRange {
  return RANGE_ORDER[(RANGE_ORDER.indexOf(range) + 1) % RANGE_ORDER.length] ?? 'today'
}

export function isHistoryRange(word: string): word is HistoryRange {
  return (RANGE_ORDER as string[]).includes(word)
}
