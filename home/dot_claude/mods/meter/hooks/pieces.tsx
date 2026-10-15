import type { Elements, RenderChildren, ThemeKey } from 'claude-code'

import type { Family } from '../types'
import { clipped, printable } from './text'

export type Terminal = Elements['terminal']

export type Cell = { text: string; color: ThemeKey }

export const ACCENT: ThemeKey = 'planMode'
export const MARK = '◎'
export const SEPARATOR = ' │ '
const HEALTHY_CACHE_PERCENT = 85
const WATCH_CACHE_PERCENT = 60
const GAUGE_CELLS = 10
const SPARK_BLOCKS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█']

export const FAMILY_COLORS: Record<Family, ThemeKey> = {
  opus: 'autoAccept',
  sonnet: 'ide',
  haiku: 'success',
  fable: 'bashBorder',
  other: 'inactive',
}

const FAMILY_NAMES: Record<Family, string> = { opus: 'Opus', sonnet: 'Sonnet', haiku: 'Haiku', fable: 'Fable', other: 'Other' }

export function familyName(family: Family): string {
  return FAMILY_NAMES[family]
}

const MAX_MODEL_LABEL = 16

export function modelLabel(family: Family, model: string): string {
  return family === 'other' ? clipped(printable(model), MAX_MODEL_LABEL) : family
}

export function cacheColor(hitPercent: number): ThemeKey {
  if (hitPercent >= HEALTHY_CACHE_PERCENT) {
    return ACCENT
  }

  return hitPercent >= WATCH_CACHE_PERCENT ? 'warning' : 'error'
}

export function drawCells(ui: Terminal, cells: Cell[]) {
  const { Text } = ui

  return cells.map(cell => <Text color={cell.color}>{cell.text}</Text>)
}

export function drawGauge(ui: Terminal, hitPercent: number) {
  const { Text } = ui
  const filled = Math.round((hitPercent / 100) * GAUGE_CELLS)

  return (
    <Text>
      <Text color={cacheColor(hitPercent)}>{'▮'.repeat(filled)}</Text>
      <Text color="inactive">{'▮'.repeat(GAUGE_CELLS - filled)}</Text>
    </Text>
  )
}

export function shareCells(parts: { family: Family; amount: number }[], width: number): Cell[] {
  const total = parts.reduce((sum, part) => sum + part.amount, 0)
  if (total <= 0 || width <= 0) {
    return []
  }
  let used = 0

  return parts.map((part, index) => {
    const isLast = index === parts.length - 1
    const cells = isLast ? width - used : Math.max(part.amount > 0 ? 1 : 0, Math.round((part.amount / total) * width))
    const count = Math.max(0, Math.min(cells, width - used))
    used += count

    return { text: '█'.repeat(count), color: FAMILY_COLORS[part.family] }
  })
}

export function sparkCells(values: number[], colorOf: (value: number) => ThemeKey, floor = 0): Cell[] {
  const max = Math.max(...values, floor + 1)

  return values.map(value => {
    const level = Math.round(((value - floor) / (max - floor)) * (SPARK_BLOCKS.length - 1))
    const block = SPARK_BLOCKS[Math.max(0, Math.min(SPARK_BLOCKS.length - 1, level))] ?? '▁'

    return { text: block, color: colorOf(value) }
  })
}

export function drawSection(ui: Terminal, title: string, aside: RenderChildren, children: RenderChildren[]) {
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

export function drawStatCard(ui: Terminal, label: string, value: string, color: ThemeKey | undefined) {
  const { Box, Text } = ui

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="inactive" paddingX={1} flexGrow={1}>
      <Text dimColor wrap="truncate-end">{label}</Text>
      <Text bold color={color} wrap="truncate-end">{value}</Text>
    </Box>
  )
}

export type Column = { width: number; isRight?: boolean }

export type ColumnSpec = { width?: number; isRight?: boolean }

const MIN_FLEX_COLUMN = 8

export function fitColumns(total: number, specs: ColumnSpec[]): Column[] {
  const fixed = specs.reduce((sum, spec) => sum + (spec.width ?? 0), 0)
  const flexWidth = Math.max(MIN_FLEX_COLUMN, total - fixed - (specs.length - 1))

  return specs.map(spec => ({ width: spec.width ?? flexWidth, isRight: spec.isRight }))
}

export function drawRow(ui: Terminal, columns: Column[], cells: RenderChildren[], dimColor = false) {
  const { Box, Text } = ui

  return (
    <Box flexDirection="row" columnGap={1}>
      {columns.map((column, index) => (
        <Box width={column.width} flexShrink={0} justifyContent={column.isRight === true ? 'flex-end' : 'flex-start'}>
          <Text dimColor={dimColor} wrap="truncate-end">{cells[index]}</Text>
        </Box>
      ))}
    </Box>
  )
}
