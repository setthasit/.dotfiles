import type { RenderChildren, ThemeKey } from 'claude-code'

import type { DoneTask, Finding, LeafOutline, LedgerView, PartOutline, PhaseOutline } from '../types'
import type { BandInput } from './band'
import { chipOf } from './chip'
import { drawLimitLines, drawPaceChip } from './limits'
import type { Terminal } from './pieces'
import { paceOfLimits } from './usage'
import {
  COUNT_METER_WIDTH,
  averageScore,
  drawAgents,
  drawChecks,
  drawChip,
  drawCountMeter,
  drawHeading,
  drawLine,
  drawRound,
  leafCounts,
  leafTitle,
  locationOf,
} from './pieces'

export type PaneInput = Omit<BandInput, 'rows'>

type PhaseState = 'shipped' | 'current' | 'not shipped' | 'started' | 'detailed' | 'outline'

const PANE_CHART_ROWS = 3
const MIN_CHART_WIDTH = 10
const MAX_FINDINGS = 12
const SCORE_WIDTH = 3
const FIX_DOTS_WIDTH = 4
const HASH_WIDTH = 7
const MAX_KIND_WIDTH = 20
const PHASE_NUMBER_WIDTH = 2
const PHASE_STATE_WIDTH = 11
const PHASE_MARKS: Record<PhaseState, { glyph: string; color: ThemeKey | null }> = {
  shipped: { glyph: '✓', color: 'success' },
  current: { glyph: '▸', color: 'claude' },
  'not shipped': { glyph: '✓', color: 'warning' },
  started: { glyph: '◐', color: 'warning' },
  detailed: { glyph: '○', color: null },
  outline: { glyph: '○', color: null },
}

function drawSection(ui: Terminal, title: string, aside: RenderChildren, children: RenderChildren[]) {
  const { Box } = ui

  return (
    <Box flexDirection="column" marginTop={1}>
      {drawHeading(ui, title, aside)}
      {children}
    </Box>
  )
}

function drawLeaf(ui: Terminal, leaf: LeafOutline, done: DoneTask | undefined, isActive: boolean) {
  const { Box, Text } = ui
  const isTodo = !leaf.isDone && !isActive
  let mark = <Text dimColor>○</Text>
  if (leaf.isDone) {
    mark = <Text color="success">✓</Text>
  } else if (isActive) {
    mark = <Text color="claude">▸</Text>
  }

  return (
    <Box flexDirection="row" columnGap={1}>
      <Box flexGrow={1} flexShrink={1} paddingLeft={2}>
        <Text wrap="truncate-end" dimColor={isTodo} bold={isActive}>
          {mark}
          {` ${leaf.id}  ${leaf.title}`}
        </Text>
      </Box>
      <Box width={SCORE_WIDTH} flexShrink={0} justifyContent="flex-end">
        <Text color="success">{done === undefined || done.score === null ? '' : String(done.score)}</Text>
      </Box>
      <Box width={FIX_DOTS_WIDTH} flexShrink={0}>
        <Text color="warning">{done === undefined ? '' : '•'.repeat(Math.min(FIX_DOTS_WIDTH, done.fixRounds))}</Text>
      </Box>
      <Box width={HASH_WIDTH} flexShrink={0}>
        <Text dimColor>{done === undefined ? '' : done.hash.slice(0, HASH_WIDTH)}</Text>
      </Box>
    </Box>
  )
}

function drawPartHeading(ui: Terminal, part: PartOutline) {
  const { Box, Text } = ui
  const done = part.leaves.filter(leaf => leaf.isDone).length

  return (
    <Box flexDirection="row" columnGap={2}>
      <Box flexGrow={1} flexShrink={1}>
        <Text wrap="truncate-end">
          <Text dimColor>{'Part '}</Text>
          <Text bold>{`${part.id}  ${part.title}`}</Text>
        </Text>
      </Box>
      <Box flexShrink={0}>{drawCountMeter(ui, done, part.leaves.length)}</Box>
    </Box>
  )
}

function drawPhaseSection(ui: Terminal, phase: PhaseOutline, ledger: LedgerView | null) {
  const { Text } = ui
  const doneById = new Map((ledger?.done ?? []).map(task => [task.id, task]))
  const activeId = ledger?.active?.id ?? null
  const counts = leafCounts(phase)
  const lines: RenderChildren[] = phase.parts.flatMap(part => [
    ...(part.id === null ? [] : [drawPartHeading(ui, part)]),
    ...part.leaves.map(leaf => drawLeaf(ui, leaf, doneById.get(leaf.id), leaf.id === activeId)),
  ])
  const average = averageScore(ledger)

  return drawSection(
    ui,
    `PHASE ${phase.number} · ${counts.done} OF ${counts.total}`,
    <Text dimColor>{average === null ? 'score · fix rounds · commit' : `avg ${average} · • is a fix round`}</Text>,
    lines,
  )
}

function phaseStateOf(outline: PhaseOutline, currentNumber: number | null, shippedPhases: number[]): PhaseState {
  if (shippedPhases.includes(outline.number)) {
    return 'shipped'
  }
  if (outline.number === currentNumber) {
    return 'current'
  }
  if (outline.isOutline) {
    return 'outline'
  }
  const counts = leafCounts(outline)
  if (counts.total > 0 && counts.done === counts.total) {
    return 'not shipped'
  }

  return counts.done > 0 ? 'started' : 'detailed'
}

function drawPhaseRow(ui: Terminal, outline: PhaseOutline, state: PhaseState) {
  const { Box, Text } = ui
  const mark = PHASE_MARKS[state]
  const counts = leafCounts(outline)
  const isCurrent = state === 'current'

  return (
    <Box flexDirection="row" columnGap={2}>
      <Box flexGrow={1} flexShrink={1}>
        <Text wrap="truncate-end" dimColor={state === 'outline'} bold={isCurrent}>
          {mark.color === null ? <Text dimColor>{mark.glyph}</Text> : <Text color={mark.color}>{mark.glyph}</Text>}
          {` ${String(outline.number).padStart(PHASE_NUMBER_WIDTH)}  ${outline.name}`}
        </Text>
      </Box>
      <Box width={PHASE_STATE_WIDTH} flexShrink={0}>
        <Text dimColor={!isCurrent} color={isCurrent ? 'claude' : undefined}>{state}</Text>
      </Box>
      <Box width={COUNT_METER_WIDTH} flexShrink={0}>
        {!outline.isOutline && drawCountMeter(ui, counts.done, counts.total)}
      </Box>
    </Box>
  )
}

function drawPhasesSection(ui: Terminal, input: PaneInput) {
  const { Text } = ui
  const shippedPhases = input.ledger?.shippedPhases ?? []
  const currentNumber = input.status?.phaseNumber ?? input.phase?.number ?? null
  const rows = input.phases.map(outline => ({ outline, state: phaseStateOf(outline, currentNumber, shippedPhases) }))
  const shipped = rows.filter(row => row.state === 'shipped').length
  const lines: RenderChildren[] = rows.map(row => drawPhaseRow(ui, row.outline, row.state))

  return drawSection(ui, `PHASES · ${shipped} OF ${input.phases.length} SHIPPED`, <Text dimColor>status · tasks done</Text>, lines)
}

function drawNowSection(ui: Terminal, input: PaneInput) {
  const { Text } = ui
  const active = input.ledger?.active ?? null
  const rounds = active?.rounds ?? []
  const lines: RenderChildren[] = [
    active === null ? drawLine(ui, 'Task', <Text dimColor>between tasks</Text>, '') : drawLine(ui, 'Task', <Text bold>{leafTitle(input.phase, active.id)}</Text>, ''),
    ...rounds.map((round, index) => drawRound(ui, round, index === rounds.length - 1)),
    ...drawAgents(ui, input.agents, input.agents.length),
    drawChecks(ui, input.ledger),
  ]

  return drawSection(ui, 'NOW', '', lines)
}

function drawFinding(ui: Terminal, finding: Finding, kindWidth: number) {
  const { Box, Text } = ui

  return (
    <Box flexDirection="row" columnGap={1}>
      <Box width={kindWidth + 2} flexShrink={0}>
        <Text wrap="truncate-end">
          <Text color={finding.kind === 'security' ? 'error' : 'warning'}>{'■ '}</Text>
          <Text bold>{finding.kind}</Text>
        </Text>
      </Box>
      <Box flexGrow={1} flexShrink={1}>
        <Text dimColor wrap="truncate-end">{finding.summary}</Text>
      </Box>
    </Box>
  )
}

function drawFindingsSection(ui: Terminal, ledger: LedgerView) {
  const { Text } = ui
  const shown = ledger.findings.slice(-MAX_FINDINGS).reverse()
  const kindWidth = Math.min(MAX_KIND_WIDTH, Math.max(...shown.map(finding => [...finding.kind].length)))
  const lines: RenderChildren[] = shown.map(finding => drawFinding(ui, finding, kindWidth))
  const hidden = ledger.findings.length - shown.length
  if (hidden > 0) {
    lines.push(<Text dimColor>{`  +${hidden} older`}</Text>)
  }

  const count = ledger.findings.length

  return drawSection(ui, `FOR YOU · ${count} FINDING${count === 1 ? '' : 'S'}`, <Text dimColor>newest first</Text>, lines)
}

function drawLedgerSection(ui: Terminal, ledger: LedgerView) {
  const { Text } = ui
  const lines = ledger.recent.map(heading => (
    <Text wrap="truncate-end">
      <Text color="subtle">{'◇ '}</Text>
      {heading}
    </Text>
  ))

  return drawSection(ui, 'LEDGER', <Text dimColor>latest first</Text>, lines)
}

export function drawPane(ui: Terminal, input: PaneInput) {
  const { Box, Text } = ui
  const chip = chipOf(input)
  const phase = input.phase
  const ledger = input.ledger
  const limits = input.limits
  const chartWidth = Math.max(MIN_CHART_WIDTH, input.columns)
  const pace = limits === null ? null : paceOfLimits(limits)

  return (
    <Box flexDirection="column">
      <Text wrap="truncate-end">
        {drawChip(ui, chip.label, chip.color)}
        <Text bold>{`  ${phase === null ? 'waiting for plan_check.py status' : `Phase ${phase.number} · ${phase.name}`}`}</Text>
      </Text>
      <Text dimColor wrap="truncate-start">{locationOf(input.tracking, input.status, false)}</Text>
      {limits !== null &&
        limits.windows.length > 0 &&
        drawSection(
          ui,
          'USAGE LIMITS',
          pace === null ? '' : drawPaceChip(ui, pace),
          drawLimitLines(ui, limits, { width: chartWidth, rows: PANE_CHART_ROWS }, false),
        )}
      {drawNowSection(ui, input)}
      {phase !== null && drawPhaseSection(ui, phase, ledger)}
      {input.phases.length > 1 && drawPhasesSection(ui, input)}
      {ledger !== null && ledger.findings.length > 0 && drawFindingsSection(ui, ledger)}
      {ledger !== null && ledger.recent.length > 0 && drawLedgerSection(ui, ledger)}
    </Box>
  )
}
