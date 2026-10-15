import type { RenderChildren, ThemeKey } from 'claude-code'

import type { BlockRecord, Family, GuardName, LiveAgent, PaneTab, PaneView, TimelineEvent, TurnCache } from '../types'
import { AI_MARK, MAX_SUBJECT_CHARS, countByGuard } from './guards'
import type { DaySpend, RangeStats, RoleSummary, Trial, TrialModel } from './history'
import { TRIAL_MIN_RUNS, sum } from './history'
import type { Column, FamilyAmount, Terminal } from './pieces'
import {
  ACCENT,
  FAMILY_COLORS,
  cacheColor,
  drawBar,
  drawCards,
  drawCells,
  drawGauge,
  drawLegend,
  drawRow,
  drawRule,
  drawSection,
  drawTable,
  familyName,
  fitColumns,
  modelLabel,
  shareCells,
  sparkCells,
} from './pieces'
import { inputTotal } from './prices'
import type { RoleView } from './tally'
import { MAIN_ROLE, familyShares, sortedViews } from './tally'
import { SLOW_MS, filtered, timelineStats } from './timeline'
import { clockTime, dayLabel, duration, hourMinute, percent, tokenCount, usd } from './text'

export type ContextCategoryView = { name: string; tokens: number }

export type ContextServer = { name: string; loadedTokens: number; calls: number }

export type ContextInput = { usedTokens: number; windowTokens: number; categories: ContextCategoryView[]; servers: ContextServer[] }

export type HistoryInput = { days: DaySpend[]; stats: RangeStats; roles: RoleSummary[]; trials: Trial[] }

export type PaneInput = {
  view: PaneView
  columns: number
  rows: number
  now: number
  roles: RoleView[]
  startedAt: number
  spentUsd: number | null
  perHour: number | null
  cachePercent: number | null
  budgetUsd: number
  live: LiveAgent[]
  turns: TurnCache[]
  timeline: TimelineEvent[]
  blocks: BlockRecord[]
  compactions: number
  areGuardsOn: boolean
  context: ContextInput | null
  history: HistoryInput | null
}

export type PaneActions = {
  onTab: (tab: PaneTab) => void
  onFilter: () => void
  onSort: () => void
  onRange: () => void
}

export const PANE_TABS: PaneTab[] = ['costs', 'timeline', 'context', 'guards', 'history']
const TAB_LABELS: Record<PaneTab, string> = { costs: 'Costs', timeline: 'Timeline', context: 'Context', guards: 'Guards', history: 'History' }
const FILTER_LABELS = { all: 'all', slow: `slow ≥${SLOW_MS / 1000}s`, blocked: 'blocked', main: 'main only' } as const
const RANGE_LABELS = { today: 'today', '7d': '7 days', '30d': '30 days' } as const
const GUARD_RULES: { guard: GuardName; event: string; rule: string }[] = [
  { guard: 'role-pin', event: 'agent.spawn', rule: 'A spawn may not pass model. The role sets its own.' },
  { guard: 'commit-message', event: 'Bash', rule: `A git commit subject needs ${AI_MARK} and at most ${MAX_SUBJECT_CHARS} characters.` },
  { guard: 'no-bypass', event: 'Bash', rule: 'git commit -n or --no-verify, and force push, are refused.' },
]
const WIDE_PANE_COLUMNS = 84
const LOW_CACHE_PERCENT = 70
const CACHE_SPARK_FLOOR = 50
const MIN_AXIS_TURNS = 20
const RECENT_BLOCKS = 8
const MAX_CATEGORIES = 7
const DAY_ROWS_MAX = 7
const DURATION_BAR_CELLS = 8
const LONGEST_BAR_MS = 600_000
const PANE_OVERHEAD_ROWS = 16
const MIN_TIMELINE_ROWS = 5
const MIN_ROLE_COLUMN = 10
const MAX_ROLE_COLUMN = 18
const ROLE_DOT_COLUMNS = 2
const CONTEXT_WATCH_PERCENT = 60
const CONTEXT_FULL_PERCENT = 85

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

function roleColumnWidth(names: string[]): number {
  const longest = Math.max(0, ...names.map(name => [...name].length))

  return Math.max(MIN_ROLE_COLUMN, Math.min(MAX_ROLE_COLUMN, longest + ROLE_DOT_COLUMNS))
}

function drawRoleName(ui: Terminal, family: Family, role: string) {
  const { Text } = ui

  return (
    <Text>
      <Text color={FAMILY_COLORS[family]}>{'● '}</Text>
      {role}
    </Text>
  )
}

function tabAction(ui: Terminal, view: PaneView, actions: PaneActions) {
  const { Button } = ui
  if (view.tab === 'costs') {
    return <Button key="sort" plain hotkey="s" label={`sort · ${view.sort}`} onPress={actions.onSort} />
  }
  if (view.tab === 'timeline') {
    return <Button key="filter" plain hotkey="f" label={`filter · ${FILTER_LABELS[view.filter]}`} onPress={actions.onFilter} />
  }
  if (view.tab === 'history') {
    return <Button key="range" plain hotkey="r" label={`range · ${RANGE_LABELS[view.range]}`} onPress={actions.onRange} />
  }

  return null
}

function drawToolbar(ui: Terminal, input: PaneInput, actions: PaneActions) {
  const { Box, Button, Text } = ui
  const action = tabAction(ui, input.view, actions)

  return (
    <Box flexDirection="column">
      <Box flexDirection="row" justifyContent="space-between" columnGap={2} flexWrap="wrap">
        <Box flexDirection="row" columnGap={1} flexShrink={0}>
          {PANE_TABS.map((tab, index) => {
            const isActive = tab === input.view.tab

            return (
              <Button key={`tab-${tab}`} plain hotkey={String(index + 1)} label={TAB_LABELS[tab]} dimColor={!isActive} onPress={() => actions.onTab(tab)}>
                <Text backgroundColor={isActive ? ACCENT : undefined} color={isActive ? 'inverseText' : undefined} bold={isActive}>{` ${TAB_LABELS[tab]} `}</Text>
              </Button>
            )
          })}
        </Box>
        {action !== null && <Box flexShrink={0}>{action}</Box>}
      </Box>
      {drawRule(ui, input.columns)}
    </Box>
  )
}

function familyAmounts(rows: { family: Family; usd: number }[]): FamilyAmount[] {
  return familyShares(rows).map(share => ({ family: share.family, amount: share.usd }))
}

function costCaption(input: PaneInput, spent: number): string {
  if (input.budgetUsd > 0) {
    return `${percent((spent / input.budgetUsd) * 100)} of ${usd(input.budgetUsd)} budget`
  }
  const runs = sum(input.roles.filter(view => view.role !== MAIN_ROLE).map(view => view.runs))

  return `${plural(runs, 'agent run')}`
}

function rateCaption(input: PaneInput, spent: number): string {
  if (input.budgetUsd === 0 || input.perHour === null || input.perHour <= 0) {
    return 'no budget set'
  }
  if (spent >= input.budgetUsd) {
    return 'budget passed'
  }

  return `budget in ~${duration(((input.budgetUsd - spent) / input.perHour) * 3_600_000)}`
}

function drawRoleTable(ui: Terminal, input: PaneInput) {
  const { Text } = ui
  const views = sortedViews(input.roles, input.view.sort)
  const specs = [
    { width: roleColumnWidth(views.map(view => view.role)) },
    { width: 7 },
    {},
    { width: 4, isRight: true },
    { width: 7, isRight: true },
    { width: 6, isRight: true },
    { width: 6, isRight: true },
    { width: 8, isRight: true },
  ]
  const columns = fitColumns(input.columns, specs)
  const shareWidth = columns[2]?.width ?? 0
  const total = views.reduce((all, view) => ({
    input: all.input + inputTotal(view.tokens),
    output: all.output + view.tokens.output,
    usd: all.usd + view.usd,
    runs: all.runs + (view.role === MAIN_ROLE ? 0 : view.runs),
  }), { input: 0, output: 0, usd: 0, runs: 0 })
  const shareOf = (amount: number) => (total.usd === 0 ? 0 : Math.max(1, Math.round((amount / total.usd) * shareWidth)))

  const rows = views.map(view =>
    drawRow(ui, columns, [
      drawRoleName(ui, view.family, view.role),
      <Text color={FAMILY_COLORS[view.family]}>{modelLabel(view.family, view.model)}</Text>,
      drawBar(ui, shareOf(view.usd), FAMILY_COLORS[view.family]),
      <Text dimColor>{view.role === MAIN_ROLE ? '—' : String(view.runs)}</Text>,
      tokenCount(inputTotal(view.tokens)),
      tokenCount(view.tokens.output),
      view.cachePercent === null ? <Text dimColor>—</Text> : <Text color={cacheColor(view.cachePercent)}>{percent(view.cachePercent)}</Text>,
      <Text bold>{usd(view.usd)}</Text>,
    ]),
  )
  const totalRow = drawRow(ui, columns, [
    <Text bold>Total</Text>,
    '',
    <Text>{drawCells(ui, shareCells(familyAmounts(views), shareWidth))}</Text>,
    <Text bold>{String(total.runs)}</Text>,
    <Text bold>{tokenCount(total.input)}</Text>,
    <Text bold>{tokenCount(total.output)}</Text>,
    input.cachePercent === null ? '' : <Text bold color={cacheColor(input.cachePercent)}>{percent(input.cachePercent)}</Text>,
    <Text bold>{usd(total.usd)}</Text>,
  ])

  return drawTable(ui, columns, ['ROLE', 'MODEL', 'SHARE', 'RUNS', 'IN', 'OUT', 'CACHE', 'COST'], rows, totalRow)
}

function drawLive(ui: Terminal, input: PaneInput) {
  const { Text } = ui
  const roleWidth = roleColumnWidth([...input.roles.map(view => view.role), ...input.live.map(agent => agent.role)])
  const columns = fitColumns(input.columns, [{ width: roleWidth }, {}, { width: 8, isRight: true }])

  return input.live.map(agent =>
    drawRow(ui, columns, [
      drawRoleName(ui, agent.family, agent.role),
      <Text dimColor>{agent.description}</Text>,
      duration(Math.max(0, input.now - agent.startedAt)),
    ]),
  )
}

function drawCacheTurns(ui: Terminal, turns: TurnCache[], columns: number) {
  const { Box, Text } = ui
  const shown = turns.slice(-columns)
  const firstNumber = turns.length - shown.length + 1
  const values = shown.map(turn => Math.max(CACHE_SPARK_FLOOR, turn.hitPercent))
  const lowest = shown.reduce<{ turn: TurnCache; number: number } | null>((low, turn, index) => {
    const number = firstNumber + index
    const isLower = number > 1 && (low === null || turn.hitPercent < low.turn.hitPercent)

    return isLower ? { turn, number } : low
  }, null)
  const lines: RenderChildren[] = [<Text>{drawCells(ui, sparkCells(values, cacheColor, CACHE_SPARK_FLOOR))}</Text>]
  if (shown.length >= MIN_AXIS_TURNS) {
    lines.push(
      <Box flexDirection="row" justifyContent="space-between" width={shown.length}>
        <Text dimColor>{`turn ${firstNumber}`}</Text>
        <Text dimColor>{`turn ${turns.length}`}</Text>
      </Box>,
    )
  }
  if (lowest !== null && lowest.turn.hitPercent < LOW_CACHE_PERCENT) {
    lines.push(
      <Box marginTop={1}>
        <Text wrap="wrap">
          <Text color="error">{`▲ Turn ${lowest.number} hit ${percent(lowest.turn.hitPercent)}. `}</Text>
          <Text dimColor>{`It wrote ${tokenCount(lowest.turn.cacheWrite)} cache tokens because the cached prefix changed, so it paid full input price.`}</Text>
        </Text>
      </Box>,
    )
  }

  return lines
}

function drawCosts(ui: Terminal, input: PaneInput) {
  const { Text } = ui
  const spent = input.spentUsd ?? sum(input.roles.map(view => view.usd))
  const cache = input.cachePercent

  return [
    drawCards(ui, input.columns, [
      { label: 'SESSION', value: duration(Math.max(0, input.now - input.startedAt)), caption: `since ${hourMinute(input.startedAt)}` },
      { label: 'COST', value: usd(spent), caption: costCaption(input, spent) },
      { label: 'RATE', value: input.perHour === null ? '…' : `${usd(input.perHour)}/h`, caption: rateCaption(input, spent) },
      {
        label: 'CACHE HIT',
        value: cache === null ? '…' : percent(cache),
        color: cache === null ? undefined : cacheColor(cache),
        caption: cache === null ? 'no turns yet' : drawGauge(ui, cache, cacheColor(cache), 12),
      },
    ]),
    input.roles.length === 0
      ? <Text dimColor>No model turns counted yet.</Text>
      : drawSection(ui, 'COST BY ROLE', drawLegend(ui, familyAmounts(input.roles)), drawRoleTable(ui, input)),
    input.live.length > 0 && drawSection(ui, 'RUNNING NOW', <Text dimColor>{plural(input.live.length, 'agent')}</Text>, drawLive(ui, input)),
    input.turns.length > 0 &&
      drawSection(ui, 'CACHE HIT BY TURN', <Text dimColor>{plural(input.turns.length, 'turn')}</Text>, drawCacheTurns(ui, input.turns, input.columns)),
  ]
}

function durationCells(ms: number): number {
  const scaled = Math.log10(ms / 100 + 1) / Math.log10(LONGEST_BAR_MS / 100 + 1)

  return Math.max(1, Math.min(DURATION_BAR_CELLS, Math.round(scaled * DURATION_BAR_CELLS)))
}

function eventLabel(event: TimelineEvent): { tool: string; color: ThemeKey | undefined; took: string } {
  if (event.kind === 'blocked') {
    return { tool: `✕ ${event.tool}`, color: 'error', took: 'blocked' }
  }
  if (event.kind === 'spawn') {
    return { tool: '↳ Agent', color: 'warning', took: 'spawn' }
  }
  if (event.kind === 'done') {
    return { tool: '✓ Done', color: 'success', took: event.durationMs === null ? '' : duration(event.durationMs) }
  }
  if (event.kind === 'failed') {
    return { tool: `✕ ${event.tool}`, color: 'error', took: event.durationMs === null ? '' : duration(event.durationMs) }
  }

  return { tool: event.tool, color: undefined, took: event.durationMs === null ? '' : duration(event.durationMs) }
}

function tookColor(event: TimelineEvent): ThemeKey | undefined {
  if (event.kind === 'slow') {
    return 'warning'
  }

  return event.kind === 'blocked' ? 'error' : undefined
}

function drawTimelineRow(ui: Terminal, event: TimelineEvent, columns: Column[]) {
  const { Text } = ui
  const label = eventLabel(event)
  const agentColor = event.family === null ? undefined : FAMILY_COLORS[event.family]
  const isTimed = event.durationMs !== null && (event.kind === 'tool' || event.kind === 'slow' || event.kind === 'failed')

  return drawRow(ui, columns, [
    <Text dimColor>{clockTime(event.at)}</Text>,
    <Text color={agentColor}>{event.agent}</Text>,
    <Text><Text bold color={label.color}>{label.tool}</Text><Text dimColor>{`  ${event.detail}`}</Text></Text>,
    <Text color={tookColor(event)} dimColor={event.kind === 'tool'}>{label.took}</Text>,
    isTimed ? drawBar(ui, durationCells(event.durationMs ?? 0), event.kind === 'slow' ? 'warning' : ACCENT) : '',
  ])
}

function drawTimeline(ui: Terminal, input: PaneInput) {
  const { Text } = ui
  const shown = filtered(input.timeline, input.view.filter)
  const room = Math.max(MIN_TIMELINE_ROWS, input.rows - PANE_OVERHEAD_ROWS)
  const columns = fitColumns(input.columns, [
    { width: 8 },
    { width: roleColumnWidth(input.timeline.map(event => event.agent)) - ROLE_DOT_COLUMNS },
    {},
    { width: 7, isRight: true },
    { width: DURATION_BAR_CELLS },
  ])
  const stats = timelineStats(input.timeline)
  const rows = shown.slice(-room).map(event => drawTimelineRow(ui, event, columns))

  return [
    drawCards(ui, input.columns, [
      { label: 'TOOL CALLS', value: String(stats.count) },
      { label: 'P95 TOOL TIME', value: stats.p95Ms === null ? '…' : duration(stats.p95Ms) },
      {
        label: 'SLOWEST',
        value: stats.slowest === null ? '…' : `${duration(stats.slowest.durationMs ?? 0)} ${stats.slowest.tool}`,
        color: stats.slowest === null ? undefined : 'warning',
      },
    ]),
    drawSection(
      ui,
      'EVENTS',
      <Text dimColor>{`${Math.min(room, shown.length)} of ${input.timeline.length} shown · oldest first`}</Text>,
      shown.length === 0
        ? [<Text dimColor>No events match this filter yet.</Text>]
        : drawTable(ui, columns, ['TIME', 'AGENT', 'EVENT', 'TOOK', ''], rows),
    ),
  ]
}

function contextColor(usedPercent: number): ThemeKey {
  if (usedPercent >= CONTEXT_FULL_PERCENT) {
    return 'error'
  }

  return usedPercent >= CONTEXT_WATCH_PERCENT ? 'warning' : ACCENT
}

function drawContext(ui: Terminal, input: PaneInput) {
  const { Box, Text } = ui
  const context = input.context
  if (context === null) {
    return [<Text dimColor>The context breakdown is not available in this session.</Text>]
  }
  const categories = [...context.categories].sort((a, b) => b.tokens - a.tokens).slice(0, MAX_CATEGORIES)
  const servers = [...context.servers].sort((a, b) => b.loadedTokens - a.loadedTokens)
  const idle = servers.filter(server => server.calls === 0 && server.loadedTokens > 0)
  const idleTokens = sum(idle.map(server => server.loadedTokens))
  const usedPercent = context.windowTokens === 0 ? 0 : (context.usedTokens / context.windowTokens) * 100
  const categoryColumns = fitColumns(input.columns, [{ width: 16 }, { width: 8, isRight: true }, { width: 6, isRight: true }, {}])
  const barWidth = categoryColumns[3]?.width ?? 0
  const serverColumns = fitColumns(input.columns, [{ width: 16 }, { width: 8, isRight: true }, { width: 8, isRight: true }, {}])

  return [
    drawCards(ui, input.columns, [
      {
        label: 'CONTEXT USED',
        value: `${tokenCount(context.usedTokens)} · ${percent(usedPercent)}`,
        color: contextColor(usedPercent),
        caption: drawGauge(ui, usedPercent, contextColor(usedPercent), 12),
      },
      { label: 'WINDOW', value: tokenCount(context.windowTokens), caption: 'estimate · no API calls' },
      { label: 'COMPACTIONS', value: String(input.compactions), caption: 'this session' },
    ]),
    drawSection(
      ui,
      'BY CATEGORY',
      '',
      drawTable(
        ui,
        categoryColumns,
        ['CATEGORY', 'TOKENS', 'SHARE', ''],
        categories.map(category => {
          const share = context.usedTokens === 0 ? 0 : category.tokens / context.usedTokens

          return drawRow(ui, categoryColumns, [
            category.name,
            tokenCount(category.tokens),
            <Text dimColor>{percent(share * 100)}</Text>,
            drawBar(ui, Math.max(1, Math.round(share * barWidth)), ACCENT),
          ])
        }),
      ),
    ),
    servers.length > 0 &&
      drawSection(
        ui,
        'MCP SERVERS',
        <Text dimColor>calls this session</Text>,
        drawTable(
          ui,
          serverColumns,
          ['SERVER', 'CALLS', 'LOADED', ''],
          servers.map(server =>
            drawRow(ui, serverColumns, [
              server.name,
              <Text color={server.calls === 0 ? 'warning' : undefined}>{String(server.calls)}</Text>,
              <Text dimColor>{server.loadedTokens === 0 ? 'deferred' : `≈${tokenCount(server.loadedTokens)}`}</Text>,
              server.calls === 0 && server.loadedTokens > 0 ? <Text color="warning">idle</Text> : '',
            ]),
          ),
        ),
      ),
    idle.length > 0 && (
      <Box marginTop={1}>
        <Text color="warning" wrap="wrap">
          {`▲ ${idle.map(server => server.name).join(' and ')} had no calls this session. Turning them off for this repo frees about ${tokenCount(idleTokens)} tokens on every turn.`}
        </Text>
      </Box>
    ),
  ]
}

function drawGuards(ui: Terminal, input: PaneInput) {
  const { Box, Text } = ui
  const counts = countByGuard(input.blocks.map(block => block.guard))
  const recent = [...input.blocks].reverse().slice(0, RECENT_BLOCKS)
  const ruleColumns = fitColumns(input.columns, [{ width: 16 }, { width: 11 }, { isWrapped: true }, { width: 6, isRight: true }])
  const blockColumns = fitColumns(input.columns, [{ width: 8 }, { width: 14 }, { width: 12 }, {}])

  return [
    drawCards(ui, input.columns, [
      { label: 'BLOCKED', value: String(input.blocks.length), color: input.blocks.length > 0 ? 'warning' : undefined, caption: 'calls this session' },
      {
        label: 'RULES',
        value: input.areGuardsOn ? 'on' : 'off',
        color: input.areGuardsOn ? 'success' : 'inactive',
        caption: `${GUARD_RULES.length} advisory rules`,
      },
    ]),
    drawSection(
      ui,
      'RULES',
      '',
      drawTable(
        ui,
        ruleColumns,
        ['RULE', 'ON', 'WHAT IT REFUSES', 'BLOCKS'],
        GUARD_RULES.map(rule => {
          const count = counts.get(rule.guard) ?? 0

          return drawRow(ui, ruleColumns, [
            <Text>
              <Text color={input.areGuardsOn ? 'success' : 'inactive'}>{input.areGuardsOn ? '✓ ' : '○ '}</Text>
              <Text bold>{rule.guard}</Text>
            </Text>,
            <Text dimColor>{rule.event}</Text>,
            <Text dimColor>{rule.rule}</Text>,
            <Text color={count > 0 ? 'warning' : 'inactive'}>{String(count)}</Text>,
          ])
        }),
      ),
    ),
    recent.length > 0 &&
      drawSection(
        ui,
        'RECENT BLOCKS',
        <Text dimColor>newest first</Text>,
        drawTable(
          ui,
          blockColumns,
          ['TIME', 'GUARD', 'AGENT', 'DETAIL'],
          recent.map(block =>
            drawRow(ui, blockColumns, [
              <Text dimColor>{clockTime(block.at)}</Text>,
              <Text color="error">{`✕ ${block.guard}`}</Text>,
              block.agent,
              <Text dimColor>{block.detail}</Text>,
            ]),
          ),
        ),
      ),
    <Box marginTop={1}>
      <Text dimColor wrap="wrap">These rules are advisory. Your permission rules stay the boundary. Turn the rules off in /config under meter.</Text>
    </Box>,
  ]
}

function drawDays(ui: Terminal, days: DaySpend[], columns: number) {
  const { Box, Text } = ui
  if (days.length > DAY_ROWS_MAX) {
    const cells = sparkCells(days.map(day => day.usd), () => ACCENT, 0)

    return [
      <Text>{drawCells(ui, cells)}</Text>,
      <Box flexDirection="row" justifyContent="space-between" width={Math.max(cells.length, 16)}>
        <Text dimColor>{dayLabel(days[0]?.day ?? '')}</Text>
        <Text dimColor>{dayLabel(days.at(-1)?.day ?? '')}</Text>
      </Box>,
    ]
  }
  const largest = Math.max(0.01, ...days.map(day => day.usd))
  const dayColumns = fitColumns(columns, [{ width: 7 }, {}, { width: 8, isRight: true }])
  const barWidth = dayColumns[1]?.width ?? 0

  return days.map(day => {
    const parts = (Object.entries(day.byFamily) as [Family, number][]).map(([family, amount]) => ({ family, amount }))
    const cells = shareCells(parts, Math.round((day.usd / largest) * barWidth))

    return drawRow(ui, dayColumns, [<Text dimColor>{dayLabel(day.day)}</Text>, <Text>{drawCells(ui, cells)}</Text>, usd(day.usd)])
  })
}

function trendText(trend: number[]): string {
  return sparkCells(trend, () => ACCENT, 0).map(cell => cell.text).join('')
}

function drawHistoryRoles(ui: Terminal, roles: RoleSummary[], columns: number) {
  const { Text } = ui
  const isWide = columns >= WIDE_PANE_COLUMNS
  const roleWidth = roleColumnWidth(roles.map(role => role.role))
  const widths = fitColumns(
    columns,
    isWide
      ? [{ width: roleWidth }, { width: 7 }, { width: 5, isRight: true }, { width: 7, isRight: true }, { width: 8, isRight: true }, { width: 5, isRight: true }, { width: 6, isRight: true }, { width: 8, isRight: true }, {}]
      : [{ width: roleWidth }, { width: 7 }, { width: 5, isRight: true }, { width: 6, isRight: true }, { width: 8, isRight: true }, {}],
  )
  const header = isWide
    ? ['ROLE', 'MODEL', 'RUNS', 'TOK/RUN', 'TIME/RUN', 'CACHE', '$/RUN', 'COST', 'TREND']
    : ['ROLE', 'MODEL', 'RUNS', '$/RUN', 'COST', 'TREND']

  return drawTable(
    ui,
    widths,
    header,
    roles.map(role => {
      const color = FAMILY_COLORS[role.family]
      const lead = [drawRoleName(ui, role.family, role.role), <Text color={color}>{modelLabel(role.family, role.model)}</Text>, <Text dimColor>{String(role.runs)}</Text>]
      const wideOnly = isWide
        ? [
            tokenCount(role.tokensPerRun),
            duration(role.msPerRun),
            role.cachePercent === null ? <Text dimColor>—</Text> : <Text color={cacheColor(role.cachePercent)}>{percent(role.cachePercent)}</Text>,
          ]
        : []
      const tail = [usd(role.usdPerRun), <Text bold>{usd(role.usd)}</Text>, <Text color={color}>{trendText(role.trend)}</Text>]

      return drawRow(ui, widths, [...lead, ...wideOnly, ...tail])
    }),
  )
}

function trialVerdict(older: TrialModel, newer: TrialModel): string {
  const [cheap, other] = older.usdPerFinished <= newer.usdPerFinished ? [older, newer] : [newer, older]
  const costGap = other.usdPerFinished === 0 ? 0 : Math.round((1 - cheap.usdPerFinished / other.usdPerFinished) * 100)
  const timeGap = other.msPerRun === 0 ? 0 : Math.round((cheap.msPerRun / other.msPerRun - 1) * 100)
  const timeText = timeGap >= 0 ? `It took ${timeGap}% longer per run.` : `It was also ${-timeGap}% faster per run.`
  const respawnText = cheap.respawns > 0 ? ` It needed ${plural(cheap.respawns, 're-spawn')}.` : ''

  return `${familyName(cheap.family)} cost ${costGap}% less per finished task. ${timeText}${respawnText}`
}

function drawTrial(ui: Terminal, trial: Trial, columns: number) {
  const { Box, Text } = ui
  const widths = fitColumns(columns, [
    {},
    { width: 5, isRight: true },
    { width: 7, isRight: true },
    { width: 10, isRight: true },
    { width: 8, isRight: true },
    { width: 10, isRight: true },
  ])
  const fewest = trial.models.reduce((low, model) => (model.runs < low.runs ? model : low))
  const older = trial.models[0]
  const newer = trial.models.at(-1)
  const aside = <Text dimColor>{trial.isReady ? 'ready' : `needs ${TRIAL_MIN_RUNS} runs per model`}</Text>

  if (!trial.isReady) {
    return drawSection(ui, `MODEL TRIAL · ${trial.role}`, aside, [
      <Text>{`${fewest.runs} of ${TRIAL_MIN_RUNS} runs on ${familyName(fewest.family)} so far.`}</Text>,
      <Text dimColor>{`The comparison appears after ${TRIAL_MIN_RUNS} runs on each model.`}</Text>,
    ])
  }

  return drawSection(ui, `MODEL TRIAL · ${trial.role}`, aside, [
    ...drawTable(
      ui,
      widths,
      ['MODEL · SINCE', 'RUNS', '$/RUN', '$/FINISHED', 'TIME/RUN', 'RE-SPAWNS'],
      trial.models.map(model =>
        drawRow(ui, widths, [
          <Text>
            <Text color={FAMILY_COLORS[model.family]}>{'● '}</Text>
            {familyName(model.family)}
            <Text dimColor>{` · ${dayLabel(model.firstDay)}`}</Text>
          </Text>,
          String(model.runs),
          usd(model.usdPerRun),
          <Text bold>{usd(model.usdPerFinished)}</Text>,
          duration(model.msPerRun),
          <Text dimColor>{`${model.respawns} of ${model.runs}`}</Text>,
        ]),
      ),
    ),
    older !== undefined && newer !== undefined && (
      <Box marginTop={1}>
        <Text wrap="wrap">{trialVerdict(older, newer)}</Text>
      </Box>
    ),
  ])
}

function drawHistory(ui: Terminal, input: PaneInput) {
  const { Text } = ui
  const history = input.history
  if (history === null || history.stats.sessions === 0) {
    return [<Text dimColor>No stored sessions in this range yet. A session is stored as it runs and when it ends.</Text>]
  }
  const stats = history.stats

  return [
    drawCards(ui, input.columns, [
      { label: 'SPEND', value: usd(stats.usd), caption: RANGE_LABELS[input.view.range] },
      { label: 'SESSIONS', value: String(stats.sessions), caption: plural(stats.runs, 'agent run') },
      { label: 'PER SESSION', value: usd(stats.meanUsd), caption: `median ${usd(stats.medianUsd)}` },
      {
        label: 'CACHE HIT',
        value: stats.cachePercent === null ? '…' : percent(stats.cachePercent),
        color: stats.cachePercent === null ? undefined : cacheColor(stats.cachePercent),
        caption: stats.cachePercent === null ? 'no turns yet' : drawGauge(ui, stats.cachePercent, cacheColor(stats.cachePercent), 10),
      },
      { label: 'BLOCKED', value: String(stats.blocks), color: stats.blocks > 0 ? 'warning' : undefined, caption: 'guard blocks' },
    ]),
    drawSection(ui, 'SPEND PER DAY', drawLegend(ui, familyAmounts(history.roles)), drawDays(ui, history.days, input.columns)),
    drawSection(ui, 'BY ROLE', '', drawHistoryRoles(ui, history.roles, input.columns)),
    ...history.trials.map(trial => drawTrial(ui, trial, input.columns)),
  ]
}

const TAB_DRAWERS: Record<PaneTab, (ui: Terminal, input: PaneInput) => RenderChildren[]> = {
  costs: drawCosts,
  timeline: drawTimeline,
  context: drawContext,
  guards: drawGuards,
  history: drawHistory,
}

export function drawPane(ui: Terminal, input: PaneInput, actions: PaneActions) {
  const { Box } = ui

  return (
    <Box flexDirection="column">
      {drawToolbar(ui, input, actions)}
      {TAB_DRAWERS[input.view.tab](ui, input)}
    </Box>
  )
}
