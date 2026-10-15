import type { Elements, RenderChildren, ThemeKey } from 'claude-code'

import type { AgentView, LedgerView, PhaseOutline, PlanStatus, Round, StepState, Tracking } from '../types'

export type Terminal = Elements['terminal']

export type StepName = 'write' | 'verify' | 'review' | 'score' | 'commit'

export const LABEL_WIDTH = 8
export const METER_CELLS = 12

const METER_GLYPH = '━'
const COUNT_WIDTH = 6
const MAX_FINDING_KINDS = 3
const SHORT_PATH_SEGMENTS = 2

export function barCells(done: number, total: number, width: number): { filled: number; empty: number } {
  if (total <= 0 || width <= 0) {
    return { filled: 0, empty: Math.max(0, width) }
  }
  const filled = Math.max(0, Math.min(width, Math.round((done / total) * width)))

  return { filled, empty: width - filled }
}

export function currentStepOf(round: Round): StepName {
  if (round.write !== 'done') {
    return 'write'
  }
  if (round.verify !== 'done') {
    return 'verify'
  }
  if (round.review !== 'done') {
    return 'review'
  }

  return round.verdict === null ? 'score' : 'commit'
}

export function roundLabel(round: Round): string {
  return round.fixNumber === 0 ? 'Round 1' : `Fix ${round.fixNumber}`
}

export function leafTitle(phase: PhaseOutline | null, id: string): string {
  const leaf = phase?.parts.flatMap(part => part.leaves).find(one => one.id === id)

  return leaf === undefined ? id : `${id} ${leaf.title}`
}

export function leafCounts(phase: PhaseOutline): { done: number; total: number } {
  const leaves = phase.parts.flatMap(part => part.leaves)

  return { done: leaves.filter(leaf => leaf.isDone).length, total: leaves.length }
}

export function currentPart(phase: PhaseOutline) {
  return phase.parts.find(part => part.leaves.some(leaf => !leaf.isDone)) ?? phase.parts.at(-1)
}

export function averageScore(ledger: LedgerView | null): number | null {
  const scores = (ledger?.done ?? []).flatMap(task => (task.score === null ? [] : [task.score]))
  if (scores.length === 0) {
    return null
  }

  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
}

export function shortPath(dir: string): string {
  const segments = dir.split('/').filter(segment => segment !== '')
  if (segments.length <= SHORT_PATH_SEGMENTS + 1) {
    return dir
  }

  return `…/${segments.slice(-SHORT_PATH_SEGMENTS).join('/')}`
}

export function locationOf(tracking: Tracking, status: PlanStatus | null, isShort: boolean): string {
  const dir = isShort ? shortPath(tracking.dir) : tracking.dir
  const branch = status?.branch ?? null

  return branch === null ? dir : `${dir} · ${branch}`
}

export function findingKinds(ledger: LedgerView): string {
  const counts = new Map<string, number>()
  for (const finding of ledger.findings) {
    counts.set(finding.kind, (counts.get(finding.kind) ?? 0) + 1)
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const shown = ranked.slice(0, MAX_FINDING_KINDS).map(([kind, count]) => `${count} ${kind}`)
  const hidden = ranked.length - MAX_FINDING_KINDS

  return [...shown, ...(hidden > 0 ? [`+${hidden} more`] : [])].join(' · ')
}

export function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

export function drawChip(ui: Terminal, label: string, color: ThemeKey) {
  const { Text } = ui

  return <Text backgroundColor={color} color="inverseText" bold>{` ${label} `}</Text>
}

export function drawMeter(ui: Terminal, done: number, total: number, color: ThemeKey, width = METER_CELLS) {
  const { Text } = ui
  const cells = barCells(done, total, width)

  return (
    <Text>
      <Text color={color}>{METER_GLYPH.repeat(cells.filled)}</Text>
      <Text color="subtle">{METER_GLYPH.repeat(cells.empty)}</Text>
    </Text>
  )
}

export function drawCountMeter(ui: Terminal, done: number, total: number) {
  const { Text } = ui

  return (
    <Text>
      {drawMeter(ui, done, total, 'success')}
      <Text dimColor>{`${done}/${total}`.padStart(COUNT_WIDTH)}</Text>
    </Text>
  )
}

export function drawHeading(ui: Terminal, title: RenderChildren, aside: RenderChildren) {
  const { Box, Text } = ui

  return (
    <Box flexDirection="row" justifyContent="space-between" columnGap={2}>
      <Box flexShrink={1}>
        <Text dimColor bold wrap="truncate-end">{title}</Text>
      </Box>
      <Box flexShrink={0}>
        <Text>{aside}</Text>
      </Box>
    </Box>
  )
}

export function drawCard(ui: Terminal, title: RenderChildren, aside: RenderChildren, width: number | undefined, children: RenderChildren[]) {
  const { Box } = ui

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="subtle"
      paddingX={1}
      width={width}
      flexGrow={width === undefined ? 1 : 0}
      flexShrink={width === undefined ? 1 : 0}
    >
      {drawHeading(ui, title, aside)}
      {children}
    </Box>
  )
}

export function drawLine(ui: Terminal, label: string, text: RenderChildren, aside: RenderChildren) {
  const { Box, Text } = ui

  return (
    <Box flexDirection="row" columnGap={2}>
      <Box flexDirection="row" flexGrow={1} flexShrink={1}>
        <Box width={LABEL_WIDTH} flexShrink={0}>
          <Text dimColor>{label}</Text>
        </Box>
        <Box flexShrink={1}>
          <Text wrap="truncate-end">{text}</Text>
        </Box>
      </Box>
      <Box flexShrink={0}>
        <Text>{aside}</Text>
      </Box>
    </Box>
  )
}

function drawStep(ui: Terminal, name: StepName, state: StepState, isCurrent: boolean, label?: string) {
  const { Text } = ui
  const text = label ?? name
  if (isCurrent) {
    return <Text backgroundColor="claude" color="inverseText" bold>{` ▸ ${text} `}</Text>
  }
  if (state === 'done') {
    return <Text color="success">{`✓ ${text}`}</Text>
  }
  if (state === 'failed') {
    return <Text color="error">{`✕ ${text}`}</Text>
  }

  return <Text dimColor>{`○ ${text}`}</Text>
}

function drawSteps(ui: Terminal, round: Round, isLast: boolean) {
  const { Text } = ui
  const current = isLast ? currentStepOf(round) : null
  const separator = <Text color="subtle">{' ─ '}</Text>
  const scoreLabel = round.score === null ? undefined : `${round.score} ${round.verdict === 'FIX' ? 'needs fixes' : 'pass'}`
  const scoreState: StepState = round.verdict === null ? 'todo' : 'done'

  return (
    <Text>
      {drawStep(ui, 'write', round.write, current === 'write')}
      {separator}
      {drawStep(ui, 'verify', round.verify, current === 'verify')}
      {separator}
      {drawStep(ui, 'review', round.review, current === 'review')}
      {separator}
      {round.verdict === 'FIX' ? (
        <Text color="warning">{`! ${scoreLabel ?? 'score'}`}</Text>
      ) : (
        drawStep(ui, 'score', scoreState, current === 'score', scoreLabel)
      )}
      {isLast && separator}
      {isLast && drawStep(ui, 'commit', 'todo', current === 'commit')}
    </Text>
  )
}

export function drawRound(ui: Terminal, round: Round, isLast: boolean) {
  return drawLine(ui, roundLabel(round), drawSteps(ui, round, isLast), '')
}

function orderedAgents(agents: AgentView[]): { agent: AgentView; isChild: boolean }[] {
  const ids = new Set(agents.map(agent => agent.id))
  const isRoot = (agent: AgentView) => agent.parentId === null || !ids.has(agent.parentId)

  return agents.filter(isRoot).flatMap(root => [
    { agent: root, isChild: false },
    ...agents.filter(agent => agent.parentId === root.id).map(agent => ({ agent, isChild: true })),
  ])
}

export function drawAgents(ui: Terminal, agents: AgentView[], maxLines: number) {
  const { Text } = ui
  const ordered = orderedAgents(agents)
  const shown = ordered.slice(0, maxLines)
  const hidden = ordered.length - shown.length

  return [
    ...shown.map(({ agent, isChild }, index) =>
      drawLine(
        ui,
        index === 0 ? 'Agents' : '',
        <Text>
          {isChild && <Text color="subtle">{'└ '}</Text>}
          <Text color="success">{'● '}</Text>
          <Text>{agent.type}</Text>
          <Text dimColor>{`  ${agent.description}`}</Text>
        </Text>,
        <Text dimColor>{`${agent.minutes}m`}</Text>,
      ),
    ),
    ...(hidden > 0 ? [drawLine(ui, '', <Text dimColor>{`+${hidden} more`}</Text>, '')] : []),
  ]
}

export function drawChecks(ui: Terminal, ledger: LedgerView | null) {
  const { Text } = ui
  const verification = ledger?.verification ?? null
  if (verification === null) {
    return null
  }
  if (verification.passed === null) {
    const text = verification.isPass
      ? <Text color="success">✓ verification passed</Text>
      : <Text color="error">✕ verification failed</Text>

    return drawLine(ui, 'Checks', text, '')
  }
  const failed = verification.failed ?? 0
  const text = (
    <Text>
      <Text color={verification.isPass ? 'success' : 'error'}>{verification.isPass ? '✓ ' : '✕ '}</Text>
      <Text>{`${verification.passed} passed`}</Text>
      <Text dimColor>{' · '}</Text>
      <Text color={failed > 0 ? 'error' : undefined} dimColor={failed === 0}>{`${failed} failed`}</Text>
    </Text>
  )

  return drawLine(ui, 'Checks', text, '')
}
