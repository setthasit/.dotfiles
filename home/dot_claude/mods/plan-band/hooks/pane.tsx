import type { RenderChildren } from 'claude-code'

import type { DoneTask, LeafOutline, LedgerView, PhaseOutline } from '../types'
import type { BandInput } from './band'
import { chipOf } from './chip'
import { drawLimitLines, drawPaceChip } from './limits'
import type { Terminal } from './pieces'
import { paceOfLimits } from './usage'
import { averageScore, drawAgents, drawChecks, drawChip, drawRound, leafCounts, leafTitle, locationOf } from './pieces'

export type PaneInput = Omit<BandInput, 'rows'>

const MAX_PANE_CHART_WIDTH = 64
const PANE_CHART_ROWS = 3
const MAX_FINDINGS = 12

function drawSection(ui: Terminal, title: string, aside: RenderChildren, children: RenderChildren[]) {
  const { Box, Text } = ui

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box flexDirection="row" justifyContent="space-between" columnGap={1}>
        <Text dimColor bold wrap="truncate-end">{title}</Text>
        <Text>{aside}</Text>
      </Box>
      {children}
    </Box>
  )
}

function drawLeaf(ui: Terminal, leaf: LeafOutline, done: DoneTask | undefined, isActive: boolean) {
  const { Box, Text } = ui
  const dots = done === undefined ? '' : '·'.repeat(done.fixRounds)
  let mark = <Text dimColor>○</Text>
  if (leaf.isDone) {
    mark = <Text color="success">✓</Text>
  } else if (isActive) {
    mark = <Text color="claude">▸</Text>
  }

  return (
    <Box flexDirection="row" justifyContent="space-between" columnGap={1}>
      <Text wrap="truncate-end" dimColor={!leaf.isDone && !isActive} bold={isActive}>
        {' '}
        {mark} {leaf.id} {leaf.title}
      </Text>
      <Text>
        <Text color="success">{done?.score === null || done === undefined ? '' : String(done.score)}</Text>
        <Text color="warning">{dots === '' ? '' : ` ${dots}`}</Text>
        <Text dimColor>{done === undefined ? '' : ` ${done.hash.slice(0, 7)}`}</Text>
      </Text>
    </Box>
  )
}

function drawPhaseSection(ui: Terminal, phase: PhaseOutline, ledger: LedgerView | null) {
  const { Text } = ui
  const doneById = new Map((ledger?.done ?? []).map(task => [task.id, task]))
  const activeId = ledger?.active?.id ?? null
  const counts = leafCounts(phase)
  const lines: RenderChildren[] = phase.parts.flatMap(part => [
    <Text bold>Part {part.id}  {part.title}</Text>,
    ...part.leaves.map(leaf => drawLeaf(ui, leaf, doneById.get(leaf.id), leaf.id === activeId)),
  ])
  const average = averageScore(ledger)

  return drawSection(
    ui,
    `PHASE ${phase.number} · ${counts.done} OF ${counts.total}`,
    <Text dimColor>{average === null ? 'score · fix rounds' : `avg ${average} · dots are fix rounds`}</Text>,
    lines,
  )
}

function drawNowSection(ui: Terminal, input: PaneInput) {
  const { Text } = ui
  const active = input.ledger?.active ?? null
  const rounds = active?.rounds ?? []
  const lines: RenderChildren[] = [
    ...rounds.map((round, index) => drawRound(ui, round, index === rounds.length - 1)),
    ...drawAgents(ui, input.agents, input.agents.length),
    drawChecks(ui, input.ledger),
  ]

  return drawSection(ui, active === null ? 'NOW · between tasks' : `NOW · ${leafTitle(input.phase, active.id)}`, '', lines)
}

function drawFindingsSection(ui: Terminal, ledger: LedgerView) {
  const { Text } = ui
  const shown = ledger.findings.slice(-MAX_FINDINGS).reverse()
  const lines: RenderChildren[] = shown.map(finding => (
    <Text wrap="truncate-end">
      <Text color={finding.kind === 'security' ? 'error' : 'warning'}> ■ </Text>
      <Text bold>{finding.kind}</Text> <Text dimColor>{finding.summary}</Text>
    </Text>
  ))
  const hidden = ledger.findings.length - shown.length
  if (hidden > 0) {
    lines.push(<Text dimColor>   +{String(hidden)} older</Text>)
  }

  return drawSection(ui, `FOR YOU · ${ledger.findings.length} FINDINGS`, <Text dimColor>newest first</Text>, lines)
}

function drawLedgerSection(ui: Terminal, ledger: LedgerView) {
  const { Text } = ui
  const lines = ledger.recent.map(heading => (
    <Text wrap="truncate-end">
      <Text color="inactive"> ◇ </Text>
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
  const chartWidth = Math.max(10, Math.min(MAX_PANE_CHART_WIDTH, input.columns - 1))
  const pace = limits === null ? null : paceOfLimits(limits)

  return (
    <Box flexDirection="column">
      <Text wrap="truncate-end">
        {drawChip(ui, chip.label, chip.color)}
        <Text bold>  {phase === null ? 'waiting for plan_check.py status' : `Phase ${phase.number} · ${phase.name}`}</Text>
      </Text>
      <Text dimColor wrap="truncate-end">{locationOf(input.tracking, input.status)}</Text>
      {limits !== null &&
        limits.windows.length > 0 &&
        drawSection(
          ui,
          'USAGE LIMITS',
          pace === null ? '' : drawPaceChip(ui, pace),
          drawLimitLines(ui, limits, { width: chartWidth, rows: PANE_CHART_ROWS }),
        )}
      {drawNowSection(ui, input)}
      {phase !== null && drawPhaseSection(ui, phase, ledger)}
      {ledger !== null && ledger.findings.length > 0 && drawFindingsSection(ui, ledger)}
      {ledger !== null && ledger.recent.length > 0 && drawLedgerSection(ui, ledger)}
    </Box>
  )
}
