import type { RenderChildren, ThemeKey } from 'claude-code'

import type { LimitWindow, LimitsView, Pace } from '../types'
import type { Terminal } from './pieces'
import type { AxisLabel, ChartKind } from './usage'
import { drawLine, drawMeter } from './pieces'
import { axisSegments, chartCells, chartRows, clockTime, columnOf, duration, paceOfLimits, resetText, windowName } from './usage'

export type ChartSize = { width: number; rows: number }

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
  unknown: 'subtle',
}

const NAME_WIDTH = 3
const PERCENT_WIDTH = 5
const SUMMARY_METER_CELLS = 6

export function drawPaceChip(ui: Terminal, pace: Pace) {
  const { Text } = ui
  const chip = PACE_CHIPS[pace]

  return <Text backgroundColor={chip.color} color="inverseText" bold>{` ${chip.label} `}</Text>
}

export function paceLabel(pace: Pace): string {
  return PACE_CHIPS[pace].label
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
        <Text dimColor wrap="truncate-start">{aside}</Text>
      </Box>
    </Box>
  )
}

function drawChart(ui: Terminal, window: LimitWindow, now: number, size: ChartSize) {
  const { Text } = ui
  const cells = chartCells(window, now, size.width)

  return chartRows(cells, size.rows).map(segments => (
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
  labels.push({ column: width, text: `↺ ${clockTime(window.resetsAt)}`, isEmphasized: false, isRightAligned: true })

  return (
    <Text dimColor>
      {axisSegments(labels, width).map(segment =>
        segment.isEmphasized ? <Text color="warning">{segment.text}</Text> : segment.text,
      )}
    </Text>
  )
}

function paceText(window: LimitWindow): string | null {
  if (window.pace === 'on-pace') {
    return null
  }
  if (window.fullAt === null) {
    return `${percentText(window)} used`
  }

  return `full ~${clockTime(window.fullAt)}`
}

function asideOf(window: LimitWindow, now: number, isCompact: boolean): string {
  const reset = isCompact ? `resets in ${duration(window.resetsAt - now)}` : resetText(window, now)
  const pace = paceText(window)

  return pace === null ? reset : `${pace} · ${reset}`
}

export function drawLimitLines(ui: Terminal, limits: LimitsView, chart: ChartSize | null, isCompact: boolean) {
  const { Text } = ui
  const now = limits.computedAt
  const lines: RenderChildren[] = []
  limits.windows.forEach((window, index) => {
    lines.push(drawWindowLine(ui, window, asideOf(window, now, isCompact)))
    if (chart === null || index !== 0) {
      return
    }
    if (hasUsage(window)) {
      lines.push(...drawChart(ui, window, now, chart))
      lines.push(drawAxis(ui, window, now, chart.width))
    } else {
      lines.push(<Text dimColor>{`   No usage yet in this ${windowName(window.kind)} window.`}</Text>)
    }
  })

  return lines
}

export function drawLimitsSummary(ui: Terminal, limits: LimitsView) {
  const { Text } = ui
  const overall = paceOfLimits(limits)
  const windows = (
    <Text>
      {limits.windows.map((window, index) => {
        const pace = paceText(window)

        return (
          <Text>
            {index > 0 && <Text color="subtle">{'  │  '}</Text>}
            <Text dimColor>{`${windowName(window.kind)} `}</Text>
            {drawMeter(ui, window.percent, 100, percentColor(window), SUMMARY_METER_CELLS)}
            <Text bold>{` ${percentText(window)}`}</Text>
            {pace !== null && <Text color="warning">{` ${pace}`}</Text>}
          </Text>
        )
      })}
    </Text>
  )

  return drawLine(ui, 'Limits', windows, overall === null ? '' : drawPaceChip(ui, overall))
}
