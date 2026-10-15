import type { RenderChildren } from 'claude-code'

import type { DoneTask, Finding, LeafOutline, LedgerView, PartOutline, PhaseOutline } from '../types'
import type { BandInput } from './band'
import { chipOf } from './chip'
import { drawLimitLines, drawPaceChip } from './limits'
import type { Terminal } from './pieces'
import { paceOfLimits } from './usage'
import {
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

const PANE_CHART_ROWS = 3
const MIN_CHART_WIDTH = 10
const MAX_FINDINGS = 12
const SCORE_WIDTH = 3
const FIX_DOTS_WIDTH = 4
const HASH_WIDTH = 7
const MAX_KIND_WIDTH = 20

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
    drawPartHeading(ui, part),
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
      {ledger !== null && ledger.findings.length > 0 && drawFindingsSection(ui, ledger)}
      {ledger !== null && ledger.recent.length > 0 && drawLedgerSection(ui, ledger)}
    </Box>
  )
}
