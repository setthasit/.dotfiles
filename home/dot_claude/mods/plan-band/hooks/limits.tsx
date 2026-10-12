import type { Elements, RenderChildren, ThemeKey } from 'claude-code'

import type { LimitWindow, LimitsView, Pace } from '../types'
import type { AxisLabel, ChartKind } from './usage'
import { axisSegments, chartCells, chartRows, clockTime, columnOf, paceOfLimits, resetText, windowName } from './usage'

type Terminal = Elements['terminal']

const PACE_CHIPS: Record<Pace, { label: string; color: ThemeKey }> = {
  'on-pace': { label: 'ON PACE', color: 'success' },
  'ease-off': { label: 'EASE OFF', color: 'warning' },
  'slow-down': { label: 'SLOW DOWN', color: 'error' },
  paused: { label: 'PAUSED', color: 'inactive' },
}

const CHART_COLORS: Record<ChartKind, ThemeKey> = {
  used: 'suggestion',
  projected: 'warning',
  over: 'error',
  unknown: 'inactive',
}

const BAR_CELLS = 10
const NAME_WIDTH = 3

export function drawPaceChip(ui: Terminal, pace: Pace) {
  const { Text } = ui
  const chip = PACE_CHIPS[pace]

  return <Text backgroundColor={chip.color} color="inverseText" bold> {chip.label} </Text>
}

export function paceLabel(pace: Pace): string {
  return PACE_CHIPS[pace].label
}

function percentColor(window: LimitWindow): ThemeKey {
  return window.pace === 'paused' ? 'error' : PACE_CHIPS[window.pace].color
}

function drawWindowLine(ui: Terminal, window: LimitWindow, aside: string) {
  const { Box, Text } = ui
  const filled = Math.min(BAR_CELLS, Math.round((window.percent / 100) * BAR_CELLS))

  return (
    <Box flexDirection="row" justifyContent="space-between" columnGap={1}>
      <Text>
        <Text dimColor>{windowName(window.kind).padEnd(NAME_WIDTH)}</Text>
        <Text color={percentColor(window)}>{'▰'.repeat(filled)}</Text>
        <Text color="inactive">{'▱'.repeat(BAR_CELLS - filled)}</Text>
        <Text bold> {`${Math.round(window.percent)}%`}</Text>
      </Text>
      <Text dimColor wrap="truncate-start">{aside}</Text>
    </Box>
  )
}

function drawChart(ui: Terminal, window: LimitWindow, now: number, width: number, rows: number) {
  const { Text } = ui
  const cells = chartCells(window, now, width)

  return chartRows(cells, rows).map(segments => (
    <Text>
      {segments.map(segment => (
        <Text color={CHART_COLORS[segment.kind]} dimColor={segment.kind === 'over'}>{segment.text}</Text>
      ))}
    </Text>
  ))
}

function drawAxis(ui: Terminal, window: LimitWindow, now: number, width: number) {
  const { Text } = ui
  const labels: AxisLabel[] = [
    { column: 0, text: clockTime(window.resetsAt - window.windowMs), isEmphasized: false },
    { column: columnOf(window, now, width), text: '▲ now', isEmphasized: false },
  ]
  if (window.fullAt !== null && window.fullAt < window.resetsAt) {
    labels.push({ column: columnOf(window, window.fullAt, width), text: `full ~${clockTime(window.fullAt)}`, isEmphasized: true })
  }
  labels.push({ column: width, text: `↺${clockTime(window.resetsAt)}`, isEmphasized: false, isRightAligned: true })

  return (
    <Text dimColor>
      {axisSegments(labels, width).map(segment =>
        segment.isEmphasized ? <Text color="warning">{segment.text}</Text> : segment.text,
      )}
    </Text>
  )
}

function paceText(window: LimitWindow): string {
  if (window.pace === 'on-pace') {
    return 'on pace'
  }
  if (window.fullAt === null) {
    return `${Math.round(window.percent)}% used`
  }

  return `full ~${clockTime(window.fullAt)}`
}

export function drawLimitLines(ui: Terminal, limits: LimitsView, chart: { width: number; rows: number } | null) {
  const now = limits.computedAt
  const lines: RenderChildren[] = []
  for (const window of limits.windows) {
    const isCharted = chart !== null && window === limits.windows[0]
    const aside = isCharted ? resetText(window, now) : `${resetText(window, now)} · ${paceText(window)}`
    lines.push(drawWindowLine(ui, window, aside))
    if (isCharted) {
      lines.push(...drawChart(ui, window, now, chart.width, chart.rows))
      lines.push(drawAxis(ui, window, now, chart.width))
    }
  }

  return lines
}

export function drawLimitsSummary(ui: Terminal, limits: LimitsView) {
  const { Text } = ui
  const pace = paceOfLimits(limits)

  return (
    <Text wrap="truncate-end">
      {pace !== null && drawPaceChip(ui, pace)}
      {limits.windows.map(window => (
        <Text>
          {'  '}
          <Text dimColor>{windowName(window.kind)}</Text> {`${Math.round(window.percent)}%`}
          {window.pace !== 'on-pace' && <Text color="warning"> {paceText(window)}</Text>}
        </Text>
      ))}
    </Text>
  )
}
