import type { ThemeKey } from 'claude-code'

import type { AgentView, ChipKind, LedgerView, LimitsView, PlanStatus } from '../types'
import { paceOfLimits } from './usage'

export type ChipInput = {
  status: PlanStatus | null
  ledger: LedgerView | null
  agents: AgentView[]
  limits: LimitsView | null
  isWorking: boolean
  isSettling: boolean
}

const WAITING_STATES = new Set(['ask-shipped', 'ask-branch', 'ask-legacy-ids', 'detail-outline'])

const CHIPS: Record<ChipKind, { label: string; color: ThemeKey }> = {
  paused: { label: '⏸ PAUSED', color: 'inactive' },
  running: { label: '● RUNNING', color: 'success' },
  waiting: { label: '◆ WAITING ON YOU', color: 'permission' },
  stopped: { label: '✕ STOPPED', color: 'error' },
  shipped: { label: '✓ ALL SHIPPED', color: 'merged' },
  idle: { label: '◌ IDLE', color: 'inactive' },
}

export function isLimitReached(limits: LimitsView | null): boolean {
  return limits !== null && paceOfLimits(limits) === 'paused'
}

export function chipKindOf(input: ChipInput): ChipKind {
  if (isLimitReached(input.limits)) {
    return 'paused'
  }
  if (input.agents.length > 0 || input.isWorking) {
    return 'running'
  }
  if (input.status !== null && WAITING_STATES.has(input.status.state)) {
    return 'waiting'
  }
  if (input.status?.state === 'done') {
    return 'shipped'
  }

  const isRunOpen = input.ledger !== null && input.ledger.run !== null

  return isRunOpen && !input.isSettling ? 'stopped' : 'idle'
}

export function chipOf(input: ChipInput): { kind: ChipKind; label: string; color: ThemeKey } {
  const kind = chipKindOf(input)

  return { kind, ...CHIPS[kind] }
}
