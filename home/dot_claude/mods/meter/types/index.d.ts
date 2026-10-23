export type Family = 'opus' | 'sonnet' | 'haiku' | 'fable' | 'other'

export type TokenCounts = { input: number; output: number; cacheRead: number; cacheWrite: number }

export type RoleTally = {
  role: string
  model: string
  family: Family
  runs: number
  respawns: number
  durationMs: number
  tokens: TokenCounts
  listUsd: number
}

export type LiveAgent = {
  id: string
  role: string
  family: Family
  description: string
  startedAt: number
  isRespawn: boolean
  contextTokens?: number
}

export type TurnCache = { hitPercent: number; cacheWrite: number }

export type EventKind = 'tool' | 'slow' | 'failed' | 'blocked' | 'spawn' | 'done'

export type TimelineEvent = {
  at: number
  agent: string
  family: Family | null
  kind: EventKind
  tool: string
  detail: string
  durationMs: number | null
}

export type GuardName = 'role-pin' | 'commit-message' | 'no-bypass'

export type BlockRecord = { at: number; guard: GuardName; agent: string; detail: string }

export type PaneTab = 'costs' | 'timeline' | 'context' | 'guards' | 'history'

export type TimelineFilter = 'all' | 'slow' | 'blocked' | 'main'

export type CostSort = 'cost' | 'tokens'

export type HistoryRange = 'today' | '7d' | '30d'

export type SessionSpend = { startedAt: number; usd: number | null; segmentStartedAt: number; segmentBaseUsd: number | null }

export type PaneView = { tab: PaneTab; filter: TimelineFilter; sort: CostSort; range: HistoryRange }

export type StoredRole = {
  role: string
  model: string
  family: Family
  runs: number
  respawns: number
  durationMs: number
  tokens: number
  cacheRead: number
  inputTotal: number
  usd: number
}

export type StoredSession = { id: string; day: string; startedAt: number; usd: number; blocks: number; roles: StoredRole[] }

export type StoredHistory = { version: 1; sessions: StoredSession[] }

declare module 'claude-code' {
  interface PluginState {
    meter: {
      roles: RoleTally[]
      live: LiveAgent[]
      agents: LiveAgent[]
      turns: TurnCache[]
      timeline: TimelineEvent[]
      blocks: BlockRecord[]
      turnBlocks: GuardName[]
      compactions: number
      spend: SessionSpend
      mcpCalls: Record<string, number>
      view: PaneView
      now: number
      isBudgetPassed: boolean
      hasOpenedPaneAtStart: boolean
    }
  }
}
