export type TrackingReason = 'status' | 'mention' | 'use'

export type Tracking = { dir: string; reason: TrackingReason }

export type PlanStatus = {
  phaseNumber: number | null
  phaseFile: string | null
  state: string
  branch: string | null
  part: string | null
  batch: string[]
  attention: string[]
}

export type LeafOutline = { id: string; title: string; isDone: boolean }

export type PartOutline = { id: string; title: string; leaves: LeafOutline[] }

export type PhaseOutline = { number: number; name: string; parts: PartOutline[] }

export type StepState = 'todo' | 'done' | 'failed'

export type Verdict = 'PASS' | 'FIX'

export type Round = {
  fixNumber: number
  write: StepState
  verify: StepState
  review: StepState
  score: number | null
  verdict: Verdict | null
}

export type ActiveTask = { id: string; rounds: Round[] }

export type DoneTask = { id: string; hash: string; score: number | null; fixRounds: number }

export type Verification = { isPass: boolean; passed: number | null; failed: number | null }

export type Finding = { kind: string; summary: string }

export type RunRange = { from: number; to: number }

export type LedgerView = {
  phaseNumber: number | null
  run: RunRange | null
  done: DoneTask[]
  active: ActiveTask | null
  verification: Verification | null
  findings: Finding[]
  shippedPhases: number[]
  recent: string[]
}

export type AgentView = {
  id: string
  parentId: string | null
  type: string
  description: string
  minutes: number
}

export type UsageSample = { at: number; percent: number }

export type UsageHistory = { kind: string; resetsAt: number; samples: UsageSample[] }

export type Pace = 'on-pace' | 'ease-off' | 'slow-down' | 'paused'

export type LimitWindow = {
  kind: string
  percent: number
  resetsAt: number
  windowMs: number
  samples: UsageSample[]
  perHour: number | null
  fullAt: number | null
  pace: Pace
}

export type LimitsView = { computedAt: number; windows: LimitWindow[] }

export type Pause = { resetsAt: number; isRunOpen: boolean }

export type ChipKind = 'paused' | 'running' | 'waiting' | 'stopped' | 'shipped' | 'idle'

export type AlertSnapshot = {
  chip: ChipKind
  doneParts: string[]
  shippedPhases: number[]
  pace: Pace | null
}

declare module 'claude-code' {
  interface PluginState {
    'plan-band': {
      tracking: Tracking | null
      status: PlanStatus | null
      phase: PhaseOutline | null
      ledger: LedgerView | null
      agents: AgentView[]
      isHidden: boolean
      isTurnRunning: boolean
      limits: LimitsView | null
      isAutoResumeOn: boolean
      pause: Pause | null
      alertSnapshot: AlertSnapshot | null
    }
  }
}
