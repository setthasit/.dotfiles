import type { RenderChildren, RenderElement } from 'claude-code'

import type { LiveAgent } from '../types'
import type { Terminal } from './pieces'
import { ACCENT, FAMILY_COLORS, MARK, SEPARATOR, cacheColor, drawGauge } from './pieces'
import { duration, percent, usd } from './text'

export type LineInput = {
  live: LiveAgent[]
  isAgentListShown: boolean
  now: number
  cachePercent: number | null
  sessionBlocks: number
  turnBlocks: number
  spentUsd: number | null
  perHour: number | null
  budgetUsd: number
  compactions: number
  columns: number
}

export type LineActions = { onPane: () => void }

const WIDE_COLUMNS = 110
const MAX_LINE_AGENTS = 3

export function isEmptyTree(tree: RenderElement): boolean {
  if (tree.type !== 'Box' && tree.type !== 'Text') {
    return false
  }
  return (tree.children ?? []).every(child => child === '')
}

function isOverBudget(input: LineInput): boolean {
  return input.budgetUsd > 0 && input.spentUsd !== null && input.spentUsd >= input.budgetUsd
}

function drawAgents(ui: Terminal, input: LineInput) {
  const { Text } = ui
  if (input.live.length === 0) {
    return <Text dimColor>idle</Text>
  }
  const shown = input.live.slice(0, MAX_LINE_AGENTS)
  const hidden = input.live.length - shown.length

  return (
    <Text>
      {shown.map((agent, index) => (
        <Text>
          {index > 0 ? '  ' : ''}
          <Text color={FAMILY_COLORS[agent.family]}>●</Text> {agent.role}{' '}
          <Text dimColor>{duration(Math.max(0, input.now - agent.startedAt))}</Text>
        </Text>
      ))}
      {hidden > 0 && <Text dimColor>{`  +${hidden}`}</Text>}
    </Text>
  )
}

function drawBlocks(ui: Terminal, input: LineInput, isWide: boolean) {
  const { Text } = ui
  if (input.turnBlocks > 0) {
    return <Text color="error" bold>{`guards ${input.turnBlocks} blocked this turn`}</Text>
  }
  const label = isWide ? 'guards ' : ''

  return (
    <Text>
      <Text dimColor>{label}</Text>
      <Text color="warning">{`${input.sessionBlocks} blocked`}</Text>
    </Text>
  )
}

function drawSpend(ui: Terminal, input: LineInput, isWide: boolean) {
  const { Text } = ui
  if (input.spentUsd === null) {
    return <Text dimColor>spend unknown</Text>
  }
  if (isOverBudget(input)) {
    return <Text color="warning" bold>{`${usd(input.spentUsd)} of ${usd(input.budgetUsd)} budget`}</Text>
  }
  const rate = isWide && input.perHour !== null ? ` · ${usd(input.perHour)}/h` : ''

  return (
    <Text>
      {usd(input.spentUsd)}
      <Text dimColor>{rate}</Text>
    </Text>
  )
}

function joined(ui: Terminal, parts: RenderChildren[]) {
  const { Text } = ui

  return parts.map((part, index) => (
    <Text>
      {index > 0 && <Text color="inactive">{SEPARATOR}</Text>}
      {part}
    </Text>
  ))
}

export function drawLine(ui: Terminal, input: LineInput, actions: LineActions) {
  const { Box, Text, Button } = ui
  const isWide = input.columns >= WIDE_COLUMNS
  const parts: RenderChildren[] = []
  if (input.isAgentListShown) {
    parts.push(drawAgents(ui, input))
  }
  if (input.cachePercent !== null) {
    parts.push(
      <Text>
        <Text dimColor>cache </Text>
        {isWide && drawGauge(ui, input.cachePercent)}
        <Text color={cacheColor(input.cachePercent)}>{`${isWide ? ' ' : ''}${percent(input.cachePercent)}`}</Text>
      </Text>,
    )
  }
  if (input.sessionBlocks > 0) {
    parts.push(drawBlocks(ui, input, isWide))
  }
  parts.push(drawSpend(ui, input, isWide))
  if (isWide && input.compactions > 0) {
    parts.push(<Text dimColor>{`compacted ${input.compactions}×`}</Text>)
  }

  return (
    <Box flexDirection="row" justifyContent="space-between" columnGap={2}>
      <Text wrap="truncate-end">
        <Text color={ACCENT} bold>{isWide ? `${MARK} meter` : MARK}</Text>
        <Text color="inactive">{SEPARATOR}</Text>
        {joined(ui, parts)}
      </Text>
      <Button key="meter-pane" plain hotkey="m" label="pane" onPress={actions.onPane} />
    </Box>
  )
}
