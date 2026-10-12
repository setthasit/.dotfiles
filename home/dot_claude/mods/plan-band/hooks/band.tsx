import type { Elements, RenderChildren, ThemeKey } from 'claude-code'

import type { AgentView, LedgerView, PhaseOutline, PlanStatus, Round, StepState, Tracking } from '../types'

type Terminal = Elements['terminal']

export type BandInput = {
  tracking: Tracking
  status: PlanStatus | null
  phase: PhaseOutline | null
  ledger: LedgerView | null
  agents: AgentView[]
  isWorking: boolean
  columns: number
}

type Chip = { label: string; color: ThemeKey }

type StepName = 'write' | 'verify' | 'review' | 'score' | 'commit'

const WIDE_COLUMNS = 150
const MEDIUM_COLUMNS = 110
const MAX_BAR_CELLS = 20
const MAX_AGENT_LINES = 3
const SHOWN_ROUNDS = 2
const LABEL_WIDTH = 8

const WAITING_STATES = new Set(['ask-shipped', 'ask-branch', 'ask-legacy-ids', 'detail-outline'])

export function chipOf(input: Pick<BandInput, 'status' | 'agents' | 'isWorking'>): Chip {
  if (input.status?.state === 'done') {
    return { label: '✓ ALL SHIPPED', color: 'merged' }
  }
  if (input.agents.length > 0 || input.isWorking) {
    return { label: '● RUNNING', color: 'success' }
  }
  if (input.status !== null && WAITING_STATES.has(input.status.state)) {
    return { label: '◆ WAITING ON YOU', color: 'permission' }
  }

  return { label: '◌ IDLE', color: 'inactive' }
}

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

function roundLabel(round: Round): string {
  return round.fixNumber === 0 ? 'Round 1' : `Fix ${round.fixNumber}`
}

function leafTitle(phase: PhaseOutline | null, id: string): string {
  const leaf = phase?.parts.flatMap(part => part.leaves).find(one => one.id === id)

  return leaf === undefined ? id : `${id} ${leaf.title}`
}

function leafCounts(phase: PhaseOutline): { done: number; total: number } {
  const leaves = phase.parts.flatMap(part => part.leaves)

  return { done: leaves.filter(leaf => leaf.isDone).length, total: leaves.length }
}

function currentPart(phase: PhaseOutline) {
  return phase.parts.find(part => part.leaves.some(leaf => !leaf.isDone)) ?? phase.parts.at(-1)
}

function averageScore(ledger: LedgerView | null): number | null {
  const scores = (ledger?.done ?? []).flatMap(task => (task.score === null ? [] : [task.score]))
  if (scores.length === 0) {
    return null
  }

  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
}

function orderedAgents(agents: AgentView[]): { agent: AgentView; isChild: boolean }[] {
  const ids = new Set(agents.map(agent => agent.id))
  const isRoot = (agent: AgentView) => agent.parentId === null || !ids.has(agent.parentId)

  return agents.filter(isRoot).flatMap(root => [
    { agent: root, isChild: false },
    ...agents.filter(agent => agent.parentId === root.id).map(agent => ({ agent, isChild: true })),
  ])
}

function findingKinds(ledger: LedgerView): string {
  const counts = new Map<string, number>()
  for (const finding of ledger.findings) {
    counts.set(finding.kind, (counts.get(finding.kind) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([kind, count]) => `${count} ${kind}`)
    .join(' · ')
}

export function layoutOf(columns: number): 'wide' | 'medium' | 'narrow' {
  if (columns >= WIDE_COLUMNS) {
    return 'wide'
  }

  return columns >= MEDIUM_COLUMNS ? 'medium' : 'narrow'
}

export function drawBand(ui: Terminal, input: BandInput, onHide: () => void) {
  const { Box } = ui
  const layout = layoutOf(input.columns)

  if (layout === 'narrow') {
    return (
      <Box flexDirection="column">
        {drawHeader(ui, input, onHide, true)}
        {drawNowLine(ui, input)}
        {drawFindings(ui, input)}
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      {drawHeader(ui, input, onHide, layout === 'medium')}
      <Box flexDirection="row" columnGap={1}>
        {layout === 'wide' && drawProgressCard(ui, input)}
        {drawNowCard(ui, input)}
      </Box>
      {drawFindings(ui, input)}
    </Box>
  )
}

export function drawHiddenLine(ui: Terminal, input: BandInput, onShow: () => void) {
  const { Box, Text, Button } = ui
  const chip = chipOf(input)
  const counts = input.phase === null ? null : leafCounts(input.phase)
  const active = input.ledger?.active ?? null
  const lastRound = active?.rounds.at(-1)
  const findings = input.ledger?.findings.length ?? 0

  return (
    <Box flexDirection="row" justifyContent="space-between">
      <Text wrap="truncate-end">
        <Text color={chip.color}>{chip.label.slice(0, 1)} </Text>
        <Text color="claude" bold>Plan {String(input.phase?.number ?? '')}</Text>
        {counts !== null && <Text dimColor> {`${counts.done}/${counts.total}`}</Text>}
        {active !== null && <Text> · {active.id} </Text>}
        {lastRound !== undefined && <Text color="claude">{roundLabel(lastRound).toLowerCase()}</Text>}
        {findings > 0 && <Text color="permission"> · ⚑ {String(findings)}</Text>}
      </Text>
      <Button key="show" plain hotkey="h" label="show" onPress={onShow} />
    </Box>
  )
}

function drawHeader(ui: Terminal, input: BandInput, onHide: () => void, withProgress: boolean) {
  const { Box, Text, Button } = ui
  const chip = chipOf(input)
  const phase = input.phase
  const counts = phase === null ? null : leafCounts(phase)
  const where = [input.tracking.dir, input.status?.branch].filter(part => part !== null && part !== undefined).join(' · ')

  return (
    <Box flexDirection="row" justifyContent="space-between">
      <Text wrap="truncate-end">
        <Text backgroundColor={chip.color} color="inverseText" bold> {chip.label} </Text>
        {phase === null ? (
          <Text dimColor>  waiting for plan_check.py status</Text>
        ) : (
          <Text bold>  Phase {String(phase.number)} · {phase.name}</Text>
        )}
        {withProgress && counts !== null && drawBar(ui, counts.done, counts.total)}
        <Text dimColor>  {where}</Text>
      </Text>
      <Button key="hide" plain hotkey="h" label="hide" onPress={onHide} />
    </Box>
  )
}

function drawBar(ui: Terminal, done: number, total: number) {
  const { Text } = ui
  const cells = barCells(done, total)

  return (
    <Text>
      {'  '}
      <Text color="success">{'▰'.repeat(cells.filled)}</Text>
      <Text color="inactive">{'▱'.repeat(cells.empty)}</Text>
      <Text dimColor> {`${done} of ${total}`}</Text>
    </Text>
  )
}

function drawCard(ui: Terminal, title: string, aside: string, width: string | undefined, children: RenderChildren[]) {
  const { Box, Text } = ui

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="inactive" paddingX={1} width={width} flexGrow={width === undefined ? 1 : 0}>
      <Box flexDirection="row" justifyContent="space-between">
        <Text dimColor bold wrap="truncate-end">{title}</Text>
        <Text dimColor>{aside}</Text>
      </Box>
      {children}
    </Box>
  )
}

function drawLine(ui: Terminal, label: string, text: RenderChildren, aside: RenderChildren) {
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

function drawProgressCard(ui: Terminal, input: BandInput) {
  const { Text } = ui
  const phase = input.phase
  const average = averageScore(input.ledger)
  const lines: RenderChildren[] = []

  const run = input.ledger?.run ?? null
  if (run !== null && phase !== null) {
    const total = run.to - run.from + 1
    const position = phase.number - run.from + 1
    lines.push(
      drawLine(ui, 'Run', `phases ${run.from} → ${run.to}`, (
        <Text>
          <Text color="claude">{'●'.repeat(Math.max(0, position))}</Text>
          <Text color="inactive">{'○'.repeat(Math.max(0, total - position))}</Text>
          <Text dimColor> {`${position} of ${total}`}</Text>
        </Text>
      )),
    )
  }
  if (phase !== null) {
    const counts = leafCounts(phase)
    lines.push(drawLine(ui, 'Phase', `${phase.number} ${phase.name}`, drawBar(ui, counts.done, counts.total)))
    const part = currentPart(phase)
    if (part !== undefined) {
      const partDone = part.leaves.filter(leaf => leaf.isDone).length
      lines.push(drawLine(ui, 'Part', `${part.id} ${part.title}`, drawBar(ui, partDone, part.leaves.length)))
    }
  }
  const last = input.ledger?.done.at(-1)
  if (last !== undefined) {
    lines.push(
      drawLine(ui, 'Last', <Text><Text color="success">✓ </Text>{leafTitle(phase, last.id)}</Text>, (
        <Text>
          <Text color="success">{last.score === null ? '' : String(last.score)}</Text>
          <Text dimColor> {last.hash.slice(0, 7)}</Text>
        </Text>
      )),
    )
  }

  return drawCard(ui, 'PROGRESS', average === null ? '' : `avg score ${average}`, '42%', lines)
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

function drawRound(ui: Terminal, round: Round, isLast: boolean) {
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

function drawAgents(ui: Terminal, agents: AgentView[]) {
  const { Text } = ui
  const ordered = orderedAgents(agents)
  const shown = ordered.slice(0, MAX_AGENT_LINES)
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

function drawChecks(ui: Terminal, ledger: LedgerView | null) {
  const { Text } = ui
  const verification = ledger?.verification ?? null
  if (verification === null) {
    return null
  }
  const counts =
    verification.passed === null ? '' : `${verification.passed} passed, ${verification.failed ?? 0} failed`

  return drawLine(
    ui,
    'Checks',
    verification.isPass ? (
      <Text><Text color="success">✓ </Text>{counts === '' ? 'verification passed' : counts}</Text>
    ) : (
      <Text color="error">✕ {counts === '' ? 'verification failed' : counts}</Text>
    ),
    '',
  )
}

function drawNowCard(ui: Terminal, input: BandInput) {
  const { Text } = ui
  const active = input.ledger?.active ?? null
  const lines: RenderChildren[] = []

  if (active === null) {
    const batch = input.status?.batch ?? []
    lines.push(
      drawLine(ui, 'Next', batch.length === 0 ? <Text dimColor>no task queued</Text> : batch.map(id => leafTitle(input.phase, id)).join(' · '), ''),
    )
  } else {
    const rounds = active.rounds.slice(-SHOWN_ROUNDS)
    rounds.forEach((round, index) => lines.push(drawRound(ui, round, index === rounds.length - 1)))
  }
  lines.push(...drawAgents(ui, input.agents))
  lines.push(drawChecks(ui, input.ledger))

  const title = active === null ? 'NOW  between tasks' : `NOW  ${leafTitle(input.phase, active.id)}`
  const part = input.phase === null ? undefined : currentPart(input.phase)

  return drawCard(ui, title, part === undefined ? '' : `part ${part.id}`, undefined, lines)
}

function drawNowLine(ui: Terminal, input: BandInput) {
  const { Text } = ui
  const active = input.ledger?.active ?? null
  const lastRound = active?.rounds.at(-1)
  const agents = input.agents.length

  return (
    <Text wrap="truncate-end">
      <Text dimColor>{'Now'.padEnd(LABEL_WIDTH)}</Text>
      {active === null ? 'between tasks' : leafTitle(input.phase, active.id)}
      {lastRound !== undefined && (
        <Text color="claude"> · {roundLabel(lastRound).toLowerCase()} ▸ {currentStepOf(lastRound)}</Text>
      )}
      {agents > 0 && <Text> · <Text color="success">●</Text> {`${agents} agent${agents === 1 ? '' : 's'}`}</Text>}
    </Text>
  )
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
          <Text color="permission">⚑ </Text>
          <Text bold>{`${findings.length} finding${findings.length === 1 ? '' : 's'} logged this phase`}</Text>
          <Text dimColor>  {findingKinds(ledger)}  · newest: {findings.at(-1)?.summary ?? ''}</Text>
        </Text>
      )}
      {attention !== undefined && (
        <Text wrap="truncate-end" color="warning">⚠ {attention}</Text>
      )}
    </Box>
  )
}
