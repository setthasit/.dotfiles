import type { RenderChildren } from 'claude-code'

import type { AgentView, LedgerView, LimitsView, Pause, PhaseOutline, PlanStatus, Tracking } from '../types'
import { chipOf } from './chip'
import { drawLimitLines, drawLimitsSummary, drawPaceChip } from './limits'
import type { Terminal } from './pieces'
import {
  averageScore,
  currentPart,
  currentStepOf,
  drawAgents,
  drawCard,
  drawChecks,
  drawChip,
  drawCountMeter,
  drawLine,
  drawMeter,
  drawRound,
  findingKinds,
  leafCounts,
  leafTitle,
  locationOf,
  plural,
  roundLabel,
} from './pieces'
import { clockTime, duration, paceOfLimits, windowName } from './usage'

export type BandInput = {
  tracking: Tracking
  status: PlanStatus | null
  phase: PhaseOutline | null
  ledger: LedgerView | null
  agents: AgentView[]
  limits: LimitsView | null
  pause: Pause | null
  isAutoResumeOn: boolean
  isWorking: boolean
  isSettling: boolean
  columns: number
  rows: number
}

export type BandActions = {
  onHide: () => void
  onShow: () => void
  onPane: () => void
  onResume: () => void
  onToggleAutoResume: () => void
}

type Layout = 'wide' | 'medium' | 'narrow'

const WIDE_COLUMNS = 150
const MEDIUM_COLUMNS = 110
const CARD_ROWS = 10
const MAX_AGENT_LINES = 3
const SHOWN_ROUNDS = 2
const CHART_ROWS = 2
const CARD_CHROME_COLUMNS = 4
const HEADER_METER_CELLS = 10
const PROGRESS_SHARE = 0.34
const WIDE_LIMITS_SHARE = 0.3
const MEDIUM_LIMITS_SHARE = 0.4

export function layoutOf(columns: number, rows: number): Layout {
  if (rows < CARD_ROWS || columns < MEDIUM_COLUMNS) {
    return 'narrow'
  }

  return columns >= WIDE_COLUMNS ? 'wide' : 'medium'
}

function hasLimits(limits: LimitsView | null): limits is LimitsView {
  return limits !== null && limits.windows.length > 0
}

export function drawBand(ui: Terminal, input: BandInput, actions: BandActions) {
  const { Box } = ui
  const layout = layoutOf(input.columns, input.rows)

  if (layout === 'narrow') {
    return (
      <Box flexDirection="column">
        {drawHeader(ui, input, actions, true)}
        {drawNowLine(ui, input)}
        {hasLimits(input.limits) && drawLimitsSummary(ui, input.limits)}
        {drawFindings(ui, input)}
      </Box>
    )
  }
  const isWide = layout === 'wide'
  const limitsWidth = Math.round(input.columns * (isWide ? WIDE_LIMITS_SHARE : MEDIUM_LIMITS_SHARE))

  return (
    <Box flexDirection="column">
      {drawHeader(ui, input, actions, !isWide)}
      <Box flexDirection="row" columnGap={1}>
        {isWide && drawProgressCard(ui, input, Math.round(input.columns * PROGRESS_SHARE))}
        {drawNowCard(ui, input)}
        {hasLimits(input.limits) && drawLimitsCard(ui, input.limits, limitsWidth, isWide)}
      </Box>
      {drawFindings(ui, input)}
    </Box>
  )
}

export function drawHiddenLine(ui: Terminal, input: BandInput, actions: BandActions) {
  const { Box, Text, Button } = ui
  const chip = chipOf(input)
  const counts = input.phase === null ? null : leafCounts(input.phase)
  const active = input.ledger?.active ?? null
  const lastRound = active?.rounds.at(-1)
  const findings = input.ledger?.findings.length ?? 0
  const firstWindow = input.limits?.windows[0]

  return (
    <Box flexDirection="row" justifyContent="space-between" columnGap={2}>
      <Box flexShrink={1}>
        <Text wrap="truncate-end">
          <Text color={chip.color}>{`${chip.label.slice(0, 1)} `}</Text>
          <Text color="claude" bold>{`Plan ${input.phase?.number ?? ''}`}</Text>
          {counts !== null && <Text dimColor>{` ${counts.done}/${counts.total}`}</Text>}
          {active !== null && <Text>{`  ·  ${active.id}`}</Text>}
          {lastRound !== undefined && <Text color="claude">{` ${roundLabel(lastRound).toLowerCase()} ▸ ${currentStepOf(lastRound)}`}</Text>}
          {firstWindow !== undefined && (
            <Text color={firstWindow.pace === 'on-pace' ? 'inactive' : 'warning'}>
              {`  ·  ▲ ${windowName(firstWindow.kind)} ${Math.round(firstWindow.percent)}%`}
            </Text>
          )}
          {findings > 0 && <Text color="permission">{`  ·  ⚑ ${findings}`}</Text>}
        </Text>
      </Box>
      <Box flexShrink={0}>
        <Button key="show" plain hotkey="h" label="show" onPress={actions.onShow} />
      </Box>
    </Box>
  )
}

function drawHeaderButtons(ui: Terminal, input: BandInput, actions: BandActions, isPaused: boolean) {
  const { Box, Button } = ui

  return (
    <Box flexDirection="row" columnGap={2} flexShrink={0}>
      {isPaused && <Button key="resume" plain hotkey="r" label="resume now" onPress={actions.onResume} />}
      {isPaused && (
        <Button
          key="auto-resume"
          plain
          hotkey="a"
          label={`auto-resume ${input.isAutoResumeOn ? 'on' : 'off'}`}
          onPress={actions.onToggleAutoResume}
        />
      )}
      <Button key="pane" plain hotkey="p" label="pane" onPress={actions.onPane} />
      <Button key="hide" plain hotkey="h" label="hide" onPress={actions.onHide} />
    </Box>
  )
}

function drawHeader(ui: Terminal, input: BandInput, actions: BandActions, withProgress: boolean) {
  const { Box, Text } = ui
  const chip = chipOf(input)
  const phase = input.phase
  const counts = phase === null ? null : leafCounts(phase)
  const resumeAt = input.pause?.resetsAt ?? null

  return (
    <Box flexDirection="row" justifyContent="space-between" columnGap={3}>
      <Box flexDirection="row" columnGap={2} flexShrink={1}>
        <Box flexShrink={0}>
          <Text wrap="truncate-end">
            {drawChip(ui, chip.label, chip.color)}
            {phase === null ? (
              <Text dimColor>{'  waiting for plan_check.py status'}</Text>
            ) : (
              <Text bold>{`  Phase ${phase.number} · ${phase.name}`}</Text>
            )}
          </Text>
        </Box>
        {chip.kind === 'paused' && resumeAt !== null && (
          <Box flexShrink={0}>
            <Text>
              <Text dimColor>{'resets in '}</Text>
              <Text color="warning" bold>{duration(resumeAt - (input.limits?.computedAt ?? resumeAt))}</Text>
              <Text dimColor>{` at ${clockTime(resumeAt)}`}</Text>
            </Text>
          </Box>
        )}
        {withProgress && counts !== null && (
          <Box flexShrink={0}>
            <Text>
              {drawMeter(ui, counts.done, counts.total, 'success', HEADER_METER_CELLS)}
              <Text dimColor>{` ${counts.done}/${counts.total}`}</Text>
            </Text>
          </Box>
        )}
        <Box flexShrink={1}>
          <Text dimColor wrap="truncate-end">{locationOf(input.tracking, input.status, true)}</Text>
        </Box>
      </Box>
      {drawHeaderButtons(ui, input, actions, chip.kind === 'paused')}
    </Box>
  )
}

function drawProgressCard(ui: Terminal, input: BandInput, width: number) {
  const { Text } = ui
  const phase = input.phase
  const average = averageScore(input.ledger)
  const lines: RenderChildren[] = []

  const run = input.ledger?.run ?? null
  if (run !== null && phase !== null) {
    const total = run.to - run.from + 1
    const position = Math.max(0, Math.min(total, phase.number - run.from + 1))
    lines.push(drawLine(ui, 'Run', `phases ${run.from} → ${run.to}`, drawCountMeter(ui, position, total)))
  }
  if (phase !== null) {
    const counts = leafCounts(phase)
    lines.push(drawLine(ui, 'Phase', `${phase.number} ${phase.name}`, drawCountMeter(ui, counts.done, counts.total)))
    const part = currentPart(phase)
    if (part !== undefined) {
      const partDone = part.leaves.filter(leaf => leaf.isDone).length
      lines.push(drawLine(ui, 'Part', `${part.id} ${part.title}`, drawCountMeter(ui, partDone, part.leaves.length)))
    }
  }
  const last = input.ledger?.done.at(-1)
  if (last !== undefined) {
    lines.push(
      drawLine(ui, 'Last', <Text><Text color="success">{'✓ '}</Text>{leafTitle(phase, last.id)}</Text>, (
        <Text>
          {last.score !== null && <Text color="success" bold>{String(last.score)}</Text>}
          <Text dimColor>{`  ${last.hash.slice(0, 7)}`}</Text>
        </Text>
      )),
    )
  }

  return drawCard(ui, 'PROGRESS', <Text dimColor>{average === null ? '' : `avg score ${average}`}</Text>, width, lines)
}

function drawNowCard(ui: Terminal, input: BandInput) {
  const { Text } = ui
  const active = input.ledger?.active ?? null
  const lines: RenderChildren[] = []

  if (active === null) {
    const batch = input.status?.batch ?? []
    const next = batch.length === 0 ? <Text dimColor>no task queued</Text> : batch.map(id => leafTitle(input.phase, id)).join(' · ')
    lines.push(drawLine(ui, 'Next', next, ''))
  } else {
    lines.push(drawLine(ui, 'Task', <Text bold>{leafTitle(input.phase, active.id)}</Text>, ''))
    const rounds = active.rounds.slice(-SHOWN_ROUNDS)
    rounds.forEach((round, index) => lines.push(drawRound(ui, round, index === rounds.length - 1)))
  }
  lines.push(...drawAgents(ui, input.agents, MAX_AGENT_LINES))
  lines.push(drawChecks(ui, input.ledger))

  const part = input.phase === null ? undefined : currentPart(input.phase)
  const title = active === null ? 'NOW · between tasks' : 'NOW'

  return drawCard(ui, title, <Text dimColor>{part === undefined ? '' : `part ${part.id}`}</Text>, undefined, lines)
}

function drawLimitsCard(ui: Terminal, limits: LimitsView, width: number, withChart: boolean) {
  const pace = paceOfLimits(limits)
  const chart = withChart ? { width: width - CARD_CHROME_COLUMNS, rows: CHART_ROWS } : null

  return drawCard(ui, 'USAGE LIMITS', pace === null ? '' : drawPaceChip(ui, pace), width, drawLimitLines(ui, limits, chart, !withChart))
}

function drawNowLine(ui: Terminal, input: BandInput) {
  const { Text } = ui
  const active = input.ledger?.active ?? null
  const lastRound = active?.rounds.at(-1)
  const agents = input.agents.length
  const text = (
    <Text>
      {active === null ? <Text dimColor>between tasks</Text> : leafTitle(input.phase, active.id)}
      {lastRound !== undefined && (
        <Text color="claude">{`  ${roundLabel(lastRound).toLowerCase()} ▸ ${currentStepOf(lastRound)}`}</Text>
      )}
    </Text>
  )
  const aside = agents > 0 ? <Text><Text color="success">{'● '}</Text><Text dimColor>{plural(agents, 'agent')}</Text></Text> : ''

  return drawLine(ui, 'Now', text, aside)
}

function drawFindings(ui: Terminal, input: BandInput) {
  const { Box, Text } = ui
  const ledger = input.ledger
  const findings = ledger?.findings ?? []
  const attention = input.status?.attention[0]
  if (findings.length === 0 && attention === undefined) {
    return null
  }

  return (
    <Box flexDirection="column">
      {ledger !== null && findings.length > 0 && (
        <Text wrap="truncate-end">
          <Text color="permission">{'⚑ '}</Text>
          <Text bold>{`${plural(findings.length, 'finding')} logged this phase`}</Text>
          <Text dimColor>{`   ${findingKinds(ledger)}`}</Text>
          <Text color="subtle">{'   │   '}</Text>
          <Text dimColor>{`newest: ${findings.at(-1)?.summary ?? ''}`}</Text>
        </Text>
      )}
      {attention !== undefined && <Text wrap="truncate-end" color="warning">{`⚠ ${attention}`}</Text>}
    </Box>
  )
}
