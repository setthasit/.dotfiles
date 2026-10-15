import type { RenderChildren, ThemeKey } from 'claude-code'

import type { BlockRecord, Family, GuardName, LiveAgent, PaneTab, PaneView, TimelineEvent, TurnCache } from '../types'
import { AI_MARK, MAX_SUBJECT_CHARS, countByGuard } from './guards'
import type { DaySpend, RangeStats, RoleSummary, Trial, TrialModel } from './history'
import { TRIAL_MIN_RUNS, sum } from './history'
import type { Column, Terminal } from './pieces'
import {
  ACCENT,
  FAMILY_COLORS,
  MARK,
  cacheColor,
  drawCells,
  drawRow,
  drawSection,
  drawStatCard,
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
import { clockTime, dayLabel, duration, percent, tokenCount, usd } from './text'

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
const FILTER_LABELS = { all: 'All', slow: `Slow ≥${SLOW_MS / 1000}s`, blocked: 'Blocked', main: 'Main only' } as const
const RANGE_LABELS = { today: 'today', '7d': '7 days', '30d': '30 days' } as const
const GUARD_RULES: { guard: GuardName; event: string; rule: string }[] = [
  { guard: 'role-pin', event: 'agent.spawn', rule: 'A spawn may not pass model. The role sets its own.' },
  { guard: 'commit-message', event: 'Bash', rule: `A git commit subject needs ${AI_MARK} and at most ${MAX_SUBJECT_CHARS} characters.` },
  { guard: 'no-bypass', event: 'Bash', rule: 'git commit -n or --no-verify, and force push, are refused.' },
]
const MAX_SHARE_CELLS = 60
const WIDE_PANE_COLUMNS = 100
const LOW_CACHE_PERCENT = 70
const CACHE_TURNS_SHOWN = 40
const RECENT_BLOCKS = 8
const MAX_CATEGORIES = 7
const DAY_ROWS_MAX = 7
const DURATION_BAR_CELLS = 8
const LONGEST_BAR_MS = 600_000
const PANE_OVERHEAD_ROWS = 14
const MIN_TIMELINE_ROWS = 5

function drawTabs(ui: Terminal, view: PaneView, actions: PaneActions) {
  const { Box, Button } = ui

  return (
    <Box flexDirection="row" columnGap={1} flexWrap="wrap">
      {PANE_TABS.map((tab, index) => (
        <Button
          key={`tab-${tab}`}
          hotkey={String(index + 1)}
          label={TAB_LABELS[tab]}
          variant={tab === view.tab ? 'primary' : 'secondary'}
          dimColor={tab !== view.tab}
          onPress={() => actions.onTab(tab)}
        />
      ))}
    </Box>
  )
}

function drawShareBar(ui: Terminal, views: RoleView[], columns: number) {
  const { Text } = ui
  const width = Math.min(MAX_SHARE_CELLS, columns)
  const cells = shareCells(
    views.map(view => ({ family: view.family, amount: view.usd })),
    width,
  )

  return <Text>{drawCells(ui, cells)}</Text>
}

function drawLegend(ui: Terminal, views: RoleView[]) {
  const { Text } = ui

  return (
    <Text>
      {familyShares(views).map(share => (
        <Text>
          <Text color={FAMILY_COLORS[share.family]}>■</Text> {familyName(share.family)} {percent(share.share * 100)}{'  '}
        </Text>
      ))}
    </Text>
  )
}

function drawRoleTable(ui: Terminal, input: PaneInput) {
  const { Text } = ui
  const columns = fitColumns(input.columns, [
    {},
    { width: 8 },
    { width: 5, isRight: true },
    { width: 7, isRight: true },
    { width: 7, isRight: true },
    { width: 6, isRight: true },
    { width: 8, isRight: true },
  ])
  const views = sortedViews(input.roles, input.view.sort)
  const total = views.reduce((all, view) => ({
    input: all.input + inputTotal(view.tokens),
    output: all.output + view.tokens.output,
    usd: all.usd + view.usd,
    runs: all.runs + (view.role === MAIN_ROLE ? 0 : view.runs),
  }), { input: 0, output: 0, usd: 0, runs: 0 })

  return [
    drawRow(ui, columns, ['ROLE', 'MODEL', 'RUNS', 'IN', 'OUT', 'CACHE', 'COST'], true),
    ...views.map(view =>
      drawRow(ui, columns, [
        <Text><Text color={FAMILY_COLORS[view.family]}>●</Text> {view.role}</Text>,
        <Text color={FAMILY_COLORS[view.family]}>{modelLabel(view.family, view.model)}</Text>,
        <Text dimColor>{view.role === MAIN_ROLE ? '·' : String(view.runs)}</Text>,
        tokenCount(inputTotal(view.tokens)),
        tokenCount(view.tokens.output),
        view.cachePercent === null ? '' : <Text color={cacheColor(view.cachePercent)}>{percent(view.cachePercent)}</Text>,
        <Text bold>{usd(view.usd)}</Text>,
      ]),
    ),
    drawRow(ui, columns, [
      <Text bold>total</Text>,
      '',
      <Text bold>{String(total.runs)}</Text>,
      <Text bold>{tokenCount(total.input)}</Text>,
      <Text bold>{tokenCount(total.output)}</Text>,
      input.cachePercent === null ? '' : <Text bold color={cacheColor(input.cachePercent)}>{percent(input.cachePercent)}</Text>,
      <Text bold>{usd(total.usd)}</Text>,
    ]),
  ]
}

function drawLive(ui: Terminal, input: PaneInput) {
  const { Text } = ui
  const columns = fitColumns(input.columns, [{ width: 14 }, {}, { width: 8, isRight: true }])

  return input.live.map(agent =>
    drawRow(ui, columns, [
      <Text><Text color={FAMILY_COLORS[agent.family]}>●</Text> {agent.role}</Text>,
      <Text dimColor>{agent.description}</Text>,
      duration(Math.max(0, input.now - agent.startedAt)),
    ]),
  )
}

function drawCacheTurns(ui: Terminal, turns: TurnCache[]) {
  const { Text } = ui
  const shown = turns.slice(-CACHE_TURNS_SHOWN)
  const firstNumber = turns.length - shown.length + 1
  const values = shown.map(turn => turn.hitPercent)
  const lowest = shown.reduce<{ turn: TurnCache; number: number } | null>((low, turn, index) => {
    const isLower = low === null || turn.hitPercent < low.turn.hitPercent

    return isLower ? { turn, number: firstNumber + index } : low
  }, null)
  const lines: RenderChildren[] = [<Text>{drawCells(ui, sparkCells(values, cacheColor, 0))}</Text>]
  if (lowest !== null && lowest.turn.hitPercent < LOW_CACHE_PERCENT) {
    lines.push(
      <Text wrap="truncate-end">
        <Text color="error">{`▲ turn ${lowest.number} · ${percent(lowest.turn.hitPercent)}`}</Text>
        <Text dimColor>{` wrote ${tokenCount(lowest.turn.cacheWrite)} cache tokens. The cached prefix changed, so that turn paid full input price.`}</Text>
      </Text>,
    )
  }

  return lines
}

function drawCosts(ui: Terminal, input: PaneInput, actions: PaneActions) {
  const { Box, Text, Button } = ui
  const spent = input.spentUsd ?? sum(input.roles.map(view => view.usd))

  return [
    <Box flexDirection="row" columnGap={1}>
      {drawStatCard(ui, 'SESSION', duration(Math.max(0, input.now - input.startedAt)), undefined)}
      {drawStatCard(ui, 'COST', usd(spent), undefined)}
      {drawStatCard(ui, 'RATE', input.perHour === null ? '…' : `${usd(input.perHour)}/h`, undefined)}
      {drawStatCard(ui, 'CACHE HIT', input.cachePercent === null ? '…' : percent(input.cachePercent), input.cachePercent === null ? undefined : cacheColor(input.cachePercent))}
    </Box>,
    input.roles.length === 0
      ? <Text dimColor>No model turns counted yet.</Text>
      : drawSection(ui, 'COST BY ROLE', drawLegend(ui, input.roles), [
          drawShareBar(ui, sortedViews(input.roles, 'cost'), input.columns),
          ...drawRoleTable(ui, input),
          <Box flexDirection="row" justifyContent="flex-end">
            <Button key="sort" plain hotkey="s" label={`sort by ${input.view.sort === 'cost' ? 'tokens' : 'cost'}`} onPress={actions.onSort} />
          </Box>,
        ]),
    input.live.length > 0 && drawSection(ui, `RUNNING NOW · ${input.live.length}`, '', drawLive(ui, input)),
    input.turns.length > 0 && drawSection(ui, 'CACHE HIT BY TURN', <Text dimColor>{`${input.turns.length} turns`}</Text>, drawCacheTurns(ui, input.turns)),
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

function drawTimelineRow(ui: Terminal, event: TimelineEvent, columns: Column[]) {
  const { Text } = ui
  const label = eventLabel(event)
  const agentColor = event.family === null ? undefined : FAMILY_COLORS[event.family]
  const isTimed = event.durationMs !== null && (event.kind === 'tool' || event.kind === 'slow' || event.kind === 'failed')
  const barColor = event.kind === 'slow' ? 'warning' : ACCENT

  return drawRow(ui, columns, [
    <Text dimColor>{clockTime(event.at)}</Text>,
    <Text color={agentColor}>{event.agent}</Text>,
    <Text><Text bold color={label.color}>{label.tool}</Text> <Text dimColor>{event.detail}</Text></Text>,
    <Text color={event.kind === 'slow' ? 'warning' : event.kind === 'blocked' ? 'error' : undefined} dimColor={event.kind === 'tool'}>{label.took}</Text>,
    isTimed ? <Text color={barColor}>{'■'.repeat(durationCells(event.durationMs ?? 0))}</Text> : '',
  ])
}

function drawTimeline(ui: Terminal, input: PaneInput, actions: PaneActions) {
  const { Box, Text, Button } = ui
  const shown = filtered(input.timeline, input.view.filter)
  const room = Math.max(MIN_TIMELINE_ROWS, input.rows - PANE_OVERHEAD_ROWS)
  const columns = fitColumns(input.columns, [{ width: 8 }, { width: 10 }, {}, { width: 7, isRight: true }, { width: DURATION_BAR_CELLS }])
  const stats = timelineStats(input.timeline)

  return [
    <Box flexDirection="row" justifyContent="space-between" columnGap={2}>
      <Button key="filter" plain hotkey="f" label={`filter: ${FILTER_LABELS[input.view.filter]}`} onPress={actions.onFilter} />
      <Text dimColor>{`${Math.min(room, shown.length)} of ${input.timeline.length} shown`}</Text>
    </Box>,
    drawRow(ui, columns, ['TIME', 'AGENT', 'EVENT', 'TOOK', ''], true),
    shown.length === 0 ? <Text dimColor>Nothing here yet.</Text> : '',
    ...shown.slice(-room).map(event => drawTimelineRow(ui, event, columns)),
    <Box flexDirection="row" columnGap={1} marginTop={1}>
      {drawStatCard(ui, 'TOOL CALLS', String(stats.count), undefined)}
      {drawStatCard(ui, 'P95 TOOL TIME', stats.p95Ms === null ? '…' : duration(stats.p95Ms), undefined)}
      {drawStatCard(
        ui,
        'SLOWEST',
        stats.slowest === null ? '…' : `${duration(stats.slowest.durationMs ?? 0)} ${stats.slowest.tool}`,
        stats.slowest === null ? undefined : 'warning',
      )}
    </Box>,
  ]
}

function drawContext(ui: Terminal, input: PaneInput) {
  const { Box, Text } = ui
  const context = input.context
  if (context === null) {
    return [<Text dimColor>The context breakdown is not available in this session.</Text>]
  }
  const categories = [...context.categories].sort((a, b) => b.tokens - a.tokens).slice(0, MAX_CATEGORIES)
  const largest = Math.max(1, ...categories.map(category => category.tokens))
  const columns = fitColumns(input.columns, [{}, { width: 8, isRight: true }, { width: 20 }])
  const servers = [...context.servers].sort((a, b) => b.loadedTokens - a.loadedTokens)
  const idle = servers.filter(server => server.calls === 0 && server.loadedTokens > 0)
  const idleTokens = sum(idle.map(server => server.loadedTokens))
  const usedPercent = context.windowTokens === 0 ? 0 : (context.usedTokens / context.windowTokens) * 100

  return [
    <Box flexDirection="row" justifyContent="space-between" columnGap={2}>
      <Text>
        <Text bold>{tokenCount(context.usedTokens)}</Text>
        <Text dimColor>{` of ${tokenCount(context.windowTokens)} used · ${percent(usedPercent)}`}</Text>
      </Text>
      <Text dimColor>estimate · no API calls</Text>
    </Box>,
    ...categories.map(category =>
      drawRow(ui, columns, [
        category.name,
        tokenCount(category.tokens),
        <Text color={ACCENT}>{'■'.repeat(Math.max(1, Math.round((category.tokens / largest) * 20)))}</Text>,
      ]),
    ),
    servers.length > 0 &&
      drawSection(
        ui,
        'MCP SERVERS · CALLS THIS SESSION',
        '',
        servers.map(server => {
          const calls = server.calls

          return drawRow(ui, columns, [
            server.name,
            <Text color={calls === 0 ? 'warning' : ACCENT}>{`${calls} calls`}</Text>,
            <Text dimColor>{server.loadedTokens === 0 ? 'deferred' : `≈${tokenCount(server.loadedTokens)}`}</Text>,
          ])
        }),
      ),
    idle.length > 0 && (
      <Box marginTop={1}>
        <Text color="warning" wrap="wrap">
          {`${idle.map(server => server.name).join(' and ')} had no calls this session. Turning them off for this repo frees about ${tokenCount(idleTokens)} tokens on every turn.`}
        </Text>
      </Box>
    ),
    <Box marginTop={1}>
      <Text dimColor>{`Compactions this session: ${input.compactions}.`}</Text>
    </Box>,
  ]
}

function drawGuards(ui: Terminal, input: PaneInput) {
  const { Box, Text } = ui
  const counts = countByGuard(input.blocks.map(block => block.guard))
  const recent = [...input.blocks].reverse().slice(0, RECENT_BLOCKS)

  return [
    <Text>
      <Text bold color={input.blocks.length > 0 ? 'warning' : undefined}>{String(input.blocks.length)}</Text>
      <Text dimColor>{` calls blocked this session · rules ${input.areGuardsOn ? 'on' : 'off'}`}</Text>
    </Text>,
    ...GUARD_RULES.map(rule => {
      const count = counts.get(rule.guard) ?? 0

      return (
        <Box flexDirection="row" justifyContent="space-between" columnGap={1} borderStyle="round" borderColor="inactive" paddingX={1}>
          <Box flexDirection="column" flexShrink={1}>
            <Text wrap="truncate-end">
              <Text color={input.areGuardsOn ? 'success' : 'inactive'}>{input.areGuardsOn ? '✓ ' : '○ '}</Text>
              <Text bold>{rule.guard}</Text>
              <Text dimColor>{` on ${rule.event}`}</Text>
            </Text>
            <Text dimColor wrap="wrap">{rule.rule}</Text>
          </Box>
          <Text color={count > 0 ? 'warning' : 'inactive'}>{String(count)}</Text>
        </Box>
      )
    }),
    recent.length > 0 &&
      drawSection(
        ui,
        'RECENT BLOCKS',
        <Text dimColor>newest first</Text>,
        recent.map(block => (
          <Text wrap="truncate-end">
            <Text dimColor>{clockTime(block.at)} </Text>
            <Text color="error">{`✕ ${block.guard}`}</Text>
            <Text dimColor>{` ${block.agent} · ${block.detail}`}</Text>
          </Text>
        )),
      ),
    <Box marginTop={1}>
      <Text dimColor wrap="wrap">These rules are advisory. Your permission rules stay the boundary. Turn the rules off in /config under meter.</Text>
    </Box>,
  ]
}

function drawDays(ui: Terminal, days: DaySpend[], columns: number) {
  const { Text } = ui
  const largest = Math.max(0.01, ...days.map(day => day.usd))
  if (days.length > DAY_ROWS_MAX) {
    const cells = sparkCells(days.map(day => day.usd), () => ACCENT, 0)

    return [
      <Text>
        {drawCells(ui, cells)}
        <Text dimColor>{`  ${dayLabel(days[0]?.day ?? '')} → ${dayLabel(days.at(-1)?.day ?? '')}`}</Text>
      </Text>,
    ]
  }
  const width = Math.max(10, Math.min(40, columns - 20))

  return days.map(day => {
    const parts = (Object.entries(day.byFamily) as [Family, number][]).map(([family, amount]) => ({ family, amount }))
    const cells = shareCells(parts, Math.round((day.usd / largest) * width))

    return (
      <Text wrap="truncate-end">
        <Text dimColor>{dayLabel(day.day).padEnd(8)}</Text>
        {drawCells(ui, cells)}
        <Text>{` ${usd(day.usd)}`}</Text>
      </Text>
    )
  })
}

function trendText(trend: number[]): string {
  return sparkCells(trend, () => ACCENT, 0).map(cell => cell.text).join('')
}

function drawHistoryRoles(ui: Terminal, roles: RoleSummary[], columns: number) {
  const { Text } = ui
  const isWide = columns >= WIDE_PANE_COLUMNS
  const widths = fitColumns(
    columns,
    isWide
      ? [{}, { width: 8 }, { width: 5, isRight: true }, { width: 8, isRight: true }, { width: 8, isRight: true }, { width: 6, isRight: true }, { width: 7, isRight: true }, { width: 8, isRight: true }, { width: 8 }]
      : [{}, { width: 8 }, { width: 5, isRight: true }, { width: 7, isRight: true }, { width: 8, isRight: true }, { width: 8 }],
  )
  const header = isWide
    ? ['ROLE', 'MODEL', 'RUNS', 'TOK/RUN', 'TIME/RUN', 'CACHE', '$/RUN', 'COST', 'TREND']
    : ['ROLE', 'MODEL', 'RUNS', '$/RUN', 'COST', 'TREND']

  return [
    drawRow(ui, widths, header, true),
    ...roles.map(role => {
      const color = FAMILY_COLORS[role.family]
      const lead = [
        <Text><Text color={color}>●</Text> {role.role}</Text>,
        <Text color={color}>{modelLabel(role.family, role.model)}</Text>,
        <Text dimColor>{String(role.runs)}</Text>,
      ]
      const wideOnly = isWide
        ? [
            tokenCount(role.tokensPerRun),
            duration(role.msPerRun),
            role.cachePercent === null ? '' : <Text color={cacheColor(role.cachePercent)}>{percent(role.cachePercent)}</Text>,
          ]
        : []
      const tail = [usd(role.usdPerRun), <Text bold>{usd(role.usd)}</Text>, <Text color={color}>{trendText(role.trend)}</Text>]

      return drawRow(ui, widths, [...lead, ...wideOnly, ...tail])
    }),
  ]
}

function trialVerdict(older: TrialModel, newer: TrialModel): string {
  const [cheap, other] = older.usdPerFinished <= newer.usdPerFinished ? [older, newer] : [newer, older]
  const costGap = other.usdPerFinished === 0 ? 0 : Math.round((1 - cheap.usdPerFinished / other.usdPerFinished) * 100)
  const timeGap = other.msPerRun === 0 ? 0 : Math.round((cheap.msPerRun / other.msPerRun - 1) * 100)
  const timeText = timeGap >= 0 ? `It took ${timeGap}% longer per run.` : `It was also ${-timeGap}% faster per run.`
  const respawnText = cheap.respawns > 0 ? ` It needed ${cheap.respawns} re-spawns.` : ''

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

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="inactive" paddingX={1}>
      <Text bold>{`Model trial · ${trial.role}`}</Text>
      {trial.isReady
        ? [
            drawRow(ui, widths, ['', 'RUNS', '$/RUN', '$/FINISHED', 'TIME/RUN', 'RE-SPAWNS'], true),
            ...trial.models.map(model =>
              drawRow(ui, widths, [
                <Text><Text color={FAMILY_COLORS[model.family]}>●</Text> {familyName(model.family)} <Text dimColor>{dayLabel(model.firstDay)}</Text></Text>,
                String(model.runs),
                usd(model.usdPerRun),
                usd(model.usdPerFinished),
                duration(model.msPerRun),
                `${model.respawns} of ${model.runs}`,
              ]),
            ),
            older !== undefined && newer !== undefined && <Text wrap="wrap">{trialVerdict(older, newer)}</Text>,
          ]
        : [
            <Text>{`${fewest.runs} of ${TRIAL_MIN_RUNS} runs on ${familyName(fewest.family)} so far.`}</Text>,
            <Text dimColor>{`The comparison appears after ${TRIAL_MIN_RUNS} runs on each model.`}</Text>,
          ]}
    </Box>
  )
}

function drawHistory(ui: Terminal, input: PaneInput, actions: PaneActions) {
  const { Box, Text, Button } = ui
  const history = input.history
  const rangeButton = <Button key="range" plain hotkey="r" label={`range: ${RANGE_LABELS[input.view.range]}`} onPress={actions.onRange} />
  if (history === null || history.stats.sessions === 0) {
    return [rangeButton, <Text dimColor>No stored sessions in this range yet. A session is stored as it runs and when it ends.</Text>]
  }
  const stats = history.stats
  const families = new Map<Family, number>()
  for (const role of history.roles) {
    families.set(role.family, (families.get(role.family) ?? 0) + role.usd)
  }

  return [
    rangeButton,
    <Box flexDirection="row" columnGap={1}>
      {drawStatCard(ui, 'SPEND', usd(stats.usd), undefined)}
      {drawStatCard(ui, 'SESSIONS', `${stats.sessions} · ${stats.runs} runs`, undefined)}
      {drawStatCard(ui, 'PER SESSION', `${usd(stats.meanUsd)} · med ${usd(stats.medianUsd)}`, undefined)}
      {drawStatCard(ui, 'CACHE HIT', stats.cachePercent === null ? '…' : percent(stats.cachePercent), stats.cachePercent === null ? undefined : cacheColor(stats.cachePercent))}
      {drawStatCard(ui, 'BLOCKED', String(stats.blocks), stats.blocks > 0 ? 'warning' : undefined)}
    </Box>,
    drawSection(ui, 'SPEND PER DAY BY MODEL', '', drawDays(ui, history.days, input.columns)),
    drawSection(
      ui,
      'MODEL SPLIT',
      '',
      [...families.entries()].sort((a, b) => b[1] - a[1]).map(([family, amount]) => (
        <Text>
          <Text color={FAMILY_COLORS[family]}>■</Text>
          {` ${familyName(family)} ${usd(amount)} `}
          <Text dimColor>{stats.usd === 0 ? '' : `${((amount / stats.usd) * 100).toFixed(1)}%`}</Text>
        </Text>
      )),
    ),
    drawSection(ui, 'BY ROLE', '', drawHistoryRoles(ui, history.roles, input.columns)),
    ...history.trials.map(trial => drawTrial(ui, trial, input.columns)),
  ]
}

const TAB_DRAWERS: Record<PaneTab, (ui: Terminal, input: PaneInput, actions: PaneActions) => RenderChildren[]> = {
  costs: drawCosts,
  timeline: drawTimeline,
  context: drawContext,
  guards: drawGuards,
  history: drawHistory,
}

export function drawPane(ui: Terminal, input: PaneInput, actions: PaneActions) {
  const { Box, Text } = ui
  const scope = input.view.tab === 'history' ? 'all sessions' : 'this session'

  return (
    <Box flexDirection="column">
      <Text>
        <Text color={ACCENT} bold>{`${MARK} Meter`}</Text>
        <Text dimColor>{` · ${scope}`}</Text>
      </Text>
      {drawTabs(ui, input.view, actions)}
      {TAB_DRAWERS[input.view.tab](ui, input, actions)}
    </Box>
  )
}
