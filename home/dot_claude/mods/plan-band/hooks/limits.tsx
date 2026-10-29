import type { RenderChildren, ThemeKey } from 'claude-code'

import type { LimitWindow, LimitsView, Pace } from '../types'
import type { Terminal } from './pieces'
import type { AxisLabel, ChartKind } from './usage'
import { drawLine, drawMeter } from './pieces'
import { axisSegments, chartRows, clockOrDay, columnOf, duration, reachesLimit, upcomingText, windowName, worstWindow } from './usage'

export type ChartSize = { width: number; rows: number }

const PACE_CHIPS: Record<Pace, { label: string; color: ThemeKey }> = {
  'on-pace': { label: 'ON PACE', color: 'success' },
  'ease-off': { label: 'EASE OFF', color: 'warning' },
  'slow-down': { label: 'SLOW DOWN', color: 'error' },
  paused: { label: 'PAUSED', color: 'inactive' },
}

const CHART_COLORS: Record<ChartKind, ThemeKey> = {
  blank: 'subtle',
  ceiling: 'subtle',
  forecast: 'inactive',
  'forecast-full': 'warning',
  over: 'error',
  used: 'suggestion',
  now: 'suggestion',
  full: 'error',
}

const NAME_WIDTH = 3
const PERCENT_WIDTH = 5
const SUMMARY_METER_CELLS = 6
const GUTTER_WIDTH = 5

export function drawPaceChip(ui: Terminal, limits: LimitsView) {
  const { Text } = ui
  const window = worstWindow(limits)
  if (window === null) {
    return ''
  }
  const chip = PACE_CHIPS[window.pace]
  const label = window.pace === 'on-pace' ? chip.label : `${chip.label} · ${windowName(window.kind)}`

  return <Text backgroundColor={chip.color} color="inverseText" bold>{` ${label} `}</Text>
}

function percentColor(window: LimitWindow): ThemeKey {
  return window.pace === 'paused' ? 'error' : PACE_CHIPS[window.pace].color
}

function percentText(window: LimitWindow): string {
  return `${Math.round(window.percent)}%`
}

function hasUsage(window: LimitWindow): boolean {
  return window.percent > 0 || window.samples.some(sample => sample.percent > 0)
}

function drawWindowLine(ui: Terminal, window: LimitWindow, aside: string) {
  const { Box, Text } = ui

  return (
    <Box flexDirection="row" justifyContent="space-between" columnGap={2}>
      <Box flexShrink={0}>
        <Text>
          <Text dimColor>{windowName(window.kind).padEnd(NAME_WIDTH)}</Text>
          {drawMeter(ui, window.percent, 100, percentColor(window))}
          <Text bold>{percentText(window).padStart(PERCENT_WIDTH)}</Text>
        </Text>
      </Box>
      <Box flexShrink={1}>
        <Text dimColor wrap="truncate-end">{aside}</Text>
      </Box>
    </Box>
  )
}

function gutterLabel(row: number, rows: number): string {
  if (row === 0) {
    return '100% '
  }

  return row === rows - 1 ? '  0% ' : ' '.repeat(GUTTER_WIDTH)
}

function drawChart(ui: Terminal, window: LimitWindow, now: number, size: ChartSize) {
  const { Text } = ui

  return chartRows(window, now, size.width - GUTTER_WIDTH, size.rows).map((segments, row) => (
    <Text>
      <Text dimColor>{gutterLabel(row, size.rows)}</Text>
      {segments.map(segment => (
        <Text color={CHART_COLORS[segment.kind]}>{segment.text}</Text>
      ))}
    </Text>
  ))
}

function drawAxis(ui: Terminal, window: LimitWindow, now: number, width: number) {
  const { Text } = ui
  const plotWidth = width - GUTTER_WIDTH
  const labels: AxisLabel[] = [
    { column: columnOf(window, now, plotWidth), text: `▲ now ${percentText(window)}`, isEmphasized: true },
    { column: plotWidth, text: `↺ ${clockOrDay(window.resetsAt, now)}`, isEmphasized: false, isRightAligned: true },
    { column: 0, text: clockOrDay(window.resetsAt - window.windowMs, now), isEmphasized: false },
  ]

  return (
    <Text dimColor>
      {` ${windowName(window.kind)}`.padEnd(GUTTER_WIDTH)}
      {axisSegments(labels, plotWidth).map(segment =>
        segment.isEmphasized ? <Text color={CHART_COLORS.now}>{segment.text}</Text> : segment.text,
      )}
    </Text>
  )
}

function forecastText(window: LimitWindow, now: number): string | null {
  if (reachesLimit(window)) {
    return upcomingText('full', window.fullAt, now)
  }

  return window.pace === 'on-pace' ? null : `${percentText(window)} used`
}

function asideOf(window: LimitWindow, now: number, isCompact: boolean): string {
  const forecast = forecastText(window, now)
  const reset = isCompact ? `resets in ${duration(window.resetsAt - now)}` : upcomingText('resets', window.resetsAt, now)
  if (forecast === null) {
    return reset
  }
  if (!reachesLimit(window)) {
    return `${forecast} · ${reset}`
  }

  return isCompact ? forecast : `${forecast} · resets ${clockOrDay(window.resetsAt, now)}`
}

export function drawLimitLines(ui: Terminal, limits: LimitsView, chart: ChartSize | null, isCompact: boolean) {
  const { Text } = ui
  const now = limits.computedAt
  const lines: RenderChildren[] = limits.windows.map(window => drawWindowLine(ui, window, asideOf(window, now, isCompact)))
  const charted = worstWindow(limits)
  if (chart === null || charted === null) {
    return lines
  }
  if (!hasUsage(charted)) {
    return [...lines, <Text dimColor>{`   No usage yet in this ${windowName(charted.kind)} window.`}</Text>]
  }

  return [...lines, ...drawChart(ui, charted, now, chart), drawAxis(ui, charted, now, chart.width)]
}

export function drawLimitsSummary(ui: Terminal, limits: LimitsView) {
  const { Text } = ui
  const windows = (
    <Text>
      {limits.windows.map((window, index) => {
        const forecast = forecastText(window, limits.computedAt)

        return (
          <Text>
            {index > 0 && <Text color="subtle">{'  │  '}</Text>}
            <Text dimColor>{`${windowName(window.kind)} `}</Text>
            {drawMeter(ui, window.percent, 100, percentColor(window), SUMMARY_METER_CELLS)}
            <Text bold>{` ${percentText(window)}`}</Text>
            {forecast !== null && <Text color="warning">{` ${forecast}`}</Text>}
          </Text>
        )
      })}
    </Text>
  )

  return drawLine(ui, 'Limits', windows, drawPaceChip(ui, limits))
}
