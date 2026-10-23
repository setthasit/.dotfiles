import type { Elements, RenderChildren, ThemeKey } from 'claude-code'

import type { Family } from '../types'
import { clipped, percent, printable } from './text'

export type Terminal = Elements['terminal']

export type Cell = { text: string; color: ThemeKey }

export type FamilyAmount = { family: Family; amount: number }

export const ACCENT: ThemeKey = 'planMode'
export const MARK = '◎'
export const SEPARATOR = ' │ '
const HEALTHY_CACHE_PERCENT = 85
const WATCH_CACHE_PERCENT = 60
const GAUGE_CELLS = 10
const METER_GLYPH = '━'
const RULE_GLYPH = '─'
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

export function drawGauge(ui: Terminal, hitPercent: number, color: ThemeKey, cells = GAUGE_CELLS) {
  const { Text } = ui
  const filled = Math.max(0, Math.min(cells, Math.round((hitPercent / 100) * cells)))

  return (
    <Text>
      <Text color={color}>{METER_GLYPH.repeat(filled)}</Text>
      <Text color="subtle">{METER_GLYPH.repeat(cells - filled)}</Text>
    </Text>
  )
}

export function drawBar(ui: Terminal, cells: number, color: ThemeKey) {
  const { Text } = ui

  return <Text color={color}>{METER_GLYPH.repeat(Math.max(0, cells))}</Text>
}

export function drawRule(ui: Terminal, width: number) {
  const { Text } = ui

  return <Text color="subtle">{RULE_GLYPH.repeat(Math.max(0, width))}</Text>
}

export function shareCells(parts: FamilyAmount[], width: number): Cell[] {
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

    return { text: METER_GLYPH.repeat(count), color: FAMILY_COLORS[part.family] }
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

export function stretchedCells(cells: Cell[], width: number): Cell[] {
  if (cells.length === 0 || width <= cells.length) {
    return cells
  }

  return cells.map((cell, index) => {
    const span = Math.floor(((index + 1) * width) / cells.length) - Math.floor((index * width) / cells.length)

    return { ...cell, text: cell.text.repeat(span) }
  })
}

export function drawLegend(ui: Terminal, parts: FamilyAmount[]) {
  const { Text } = ui
  const total = parts.reduce((sum, part) => sum + part.amount, 0)
  const ranked = [...parts].sort((a, b) => b.amount - a.amount)

  return (
    <Text>
      {ranked.map((part, index) => (
        <Text>
          <Text color={FAMILY_COLORS[part.family]}>{`${index > 0 ? '   ' : ''}■ `}</Text>
          {familyName(part.family)}
          <Text dimColor>{` ${percent(total === 0 ? 0 : (part.amount / total) * 100)}`}</Text>
        </Text>
      ))}
    </Text>
  )
}

function drawHeading(ui: Terminal, title: RenderChildren, aside: RenderChildren) {
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

export function drawSection(ui: Terminal, title: string, aside: RenderChildren, children: RenderChildren[]) {
  const { Box } = ui

  return (
    <Box flexDirection="column" marginTop={1}>
      {drawHeading(ui, title, aside)}
      {children}
    </Box>
  )
}

type StatCard = { label: string; value: string; color?: ThemeKey; caption?: RenderChildren }

const CARD_GAP = 1

export function drawCards(ui: Terminal, columns: number, cards: StatCard[]) {
  const { Box, Text } = ui
  const room = columns - CARD_GAP * (cards.length - 1)
  const width = Math.floor(room / cards.length)
  const widened = room - width * cards.length

  return (
    <Box flexDirection="row" columnGap={CARD_GAP}>
      {cards.map((card, index) => (
        <Box flexDirection="column" borderStyle="round" borderColor="subtle" paddingX={1} width={index < widened ? width + 1 : width} flexShrink={0}>
          <Text dimColor wrap="truncate-end">{card.label}</Text>
          <Text bold color={card.color} wrap="truncate-end">{card.value}</Text>
          {card.caption !== undefined && <Text dimColor wrap="truncate-end">{card.caption}</Text>}
        </Box>
      ))}
    </Box>
  )
}

export type Column = { width: number; isRight?: boolean; isWrapped?: boolean }

export type ColumnSpec = { width?: number; isRight?: boolean; isWrapped?: boolean }

const MIN_FLEX_COLUMN = 8

export function fitColumns(total: number, specs: ColumnSpec[]): Column[] {
  const fixed = specs.reduce((sum, spec) => sum + (spec.width ?? 0), 0)
  const flexWidth = Math.max(MIN_FLEX_COLUMN, total - fixed - (specs.length - 1))

  return specs.map(spec => ({ width: spec.width ?? flexWidth, isRight: spec.isRight, isWrapped: spec.isWrapped }))
}

export function drawRow(ui: Terminal, columns: Column[], cells: RenderChildren[], dimColor = false) {
  const { Box, Text } = ui

  return (
    <Box flexDirection="row" columnGap={1}>
      {columns.map((column, index) => (
        <Box width={column.width} flexShrink={0} justifyContent={column.isRight === true ? 'flex-end' : 'flex-start'}>
          <Text dimColor={dimColor} wrap={column.isWrapped === true ? 'wrap' : 'truncate-end'}>{cells[index]}</Text>
        </Box>
      ))}
    </Box>
  )
}

export function drawTable(ui: Terminal, columns: Column[], header: string[], rows: RenderChildren[], total: RenderChildren = null) {
  const width = columns.reduce((sum, column) => sum + column.width, 0) + columns.length - 1

  return [
    drawRow(ui, columns, header, true),
    drawRule(ui, width),
    ...rows,
    ...(total === null ? [] : [drawRule(ui, width), total]),
  ]
}
