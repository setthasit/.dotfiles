import type { Elements, RenderChildren, ThemeKey } from 'claude-code'

import type { AgentView, LedgerView, PhaseOutline, PlanStatus, Round, StepState, Tracking } from '../types'

export type Terminal = Elements['terminal']

export type StepName = 'write' | 'verify' | 'review' | 'score' | 'commit'

export const LABEL_WIDTH = 8

const MAX_BAR_CELLS = 20

export function barCells(done: number, total: number): { filled: number; empty: number } {
  if (total <= 0) {
    return { filled: 0, empty: 0 }
  }
  const cells = Math.min(total, MAX_BAR_CELLS)
  const filled = Math.round((done / total) * cells)

  return { filled, empty: cells - filled }
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

export function locationOf(tracking: Tracking, status: PlanStatus | null): string {
  const branch = status?.branch ?? null

  return branch === null ? tracking.dir : `${tracking.dir} · ${branch}`
}

export function findingKinds(ledger: LedgerView): string {
  const counts = new Map<string, number>()
  for (const finding of ledger.findings) {
    counts.set(finding.kind, (counts.get(finding.kind) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([kind, count]) => `${count} ${kind}`)
    .join(' · ')
}

export function drawChip(ui: Terminal, label: string, color: ThemeKey) {
  const { Text } = ui

  return <Text backgroundColor={color} color="inverseText" bold> {label} </Text>
}

export function drawBar(ui: Terminal, done: number, total: number) {
  const { Text } = ui
  const cells = barCells(done, total)

  return (
    <Text>
      <Text color="success">{'▰'.repeat(cells.filled)}</Text>
      <Text color="inactive">{'▱'.repeat(cells.empty)}</Text>
      <Text dimColor> {`${done} of ${total}`}</Text>
    </Text>
  )
}

export function drawCard(ui: Terminal, title: RenderChildren, aside: RenderChildren, width: string | undefined, children: RenderChildren[]) {
  const { Box, Text } = ui

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="inactive" paddingX={1} width={width} flexGrow={width === undefined ? 1 : 0}>
      <Box flexDirection="row" justifyContent="space-between" columnGap={1}>
        <Text dimColor bold wrap="truncate-end">{title}</Text>
        <Text>{aside}</Text>
      </Box>
      {children}
    </Box>
  )
}

export function drawLine(ui: Terminal, label: string, text: RenderChildren, aside: RenderChildren) {
  const { Box, Text } = ui

  return (
    <Box flexDirection="row" justifyContent="space-between" columnGap={1}>
      <Text wrap="truncate-end">
        <Text dimColor>{label.padEnd(LABEL_WIDTH)}</Text>
        {text}
      </Text>
      <Text>{aside}</Text>
    </Box>
  )
}

function drawStep(ui: Terminal, name: StepName, state: StepState, isCurrent: boolean, label?: string) {
  const { Text } = ui
  const text = label ?? name
  if (isCurrent) {
    return <Text backgroundColor="claude" color="inverseText" bold> ▸ {text} </Text>
  }
  if (state === 'done') {
    return <Text color="success">✓ {text}</Text>
  }
  if (state === 'failed') {
    return <Text color="error">✕ {text}</Text>
  }

  return <Text dimColor>{text}</Text>
}

export function drawRound(ui: Terminal, round: Round, isLast: boolean) {
  const { Text } = ui
  const current = isLast ? currentStepOf(round) : null
  const separator = <Text color="inactive"> ─ </Text>
  const scoreLabel = round.score === null ? undefined : `${round.score} ${round.verdict === 'FIX' ? 'needs fixes' : 'pass'}`
  const scoreState: StepState = round.verdict === null ? 'todo' : 'done'

  return (
    <Text wrap="truncate-end">
      <Text dimColor>{roundLabel(round).padEnd(LABEL_WIDTH + 2)}</Text>
      {drawStep(ui, 'write', round.write, current === 'write')}
      {separator}
      {drawStep(ui, 'verify', round.verify, current === 'verify')}
      {separator}
      {drawStep(ui, 'review', round.review, current === 'review')}
      {separator}
      {round.verdict === 'FIX' ? (
        <Text color="warning">{scoreLabel ?? 'score'}</Text>
      ) : (
        drawStep(ui, 'score', scoreState, current === 'score', scoreLabel)
      )}
      {isLast && separator}
      {isLast && drawStep(ui, 'commit', 'todo', current === 'commit')}
    </Text>
  )
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
          {isChild ? <Text color="inactive">└ </Text> : ''}
          <Text color="success">● </Text>
          {agent.type} <Text dimColor>{agent.description}</Text>
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
  const counts = verification.passed === null ? '' : `${verification.passed} passed, ${verification.failed ?? 0} failed`
  const text = verification.isPass ? (
    <Text><Text color="success">✓ </Text>{counts === '' ? 'verification passed' : counts}</Text>
  ) : (
    <Text color="error">✕ {counts === '' ? 'verification failed' : counts}</Text>
  )

  return drawLine(ui, 'Checks', text, '')
}
