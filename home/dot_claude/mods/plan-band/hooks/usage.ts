import type { LimitWindow, LimitsView, Pace, UsageHistory, UsageSample } from '../types'

export type ChartKind = 'blank' | 'ceiling' | 'forecast' | 'forecast-full' | 'over' | 'used' | 'now' | 'full'

export type Segment = { text: string; kind: ChartKind }

export type AxisLabel = { column: number; text: string; isEmphasized: boolean; isRightAligned?: boolean }

type ChartCell = { bits: number; kind: ChartKind; mark?: string }

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const WINDOW_SPECS: Record<string, { length: number; paceLookback: number }> = {
  five_hour: { length: 5 * HOUR_MS, paceLookback: 30 * MINUTE_MS },
  seven_day: { length: 7 * DAY_MS, paceLookback: DAY_MS },
}
const WINDOW_NAMES: Record<string, string> = { five_hour: '5h', seven_day: '7d', spend_limit: '$' }
const MIN_HISTORY_MS = 5 * MINUTE_MS
const HEARTBEAT_MS = 5 * MINUTE_MS
const SLOW_DOWN_PERCENT = 90
const SLOW_DOWN_WITHIN_MS = 30 * MINUTE_MS
const MAX_SAMPLES = 500
const PACE_ORDER: Pace[] = ['on-pace', 'ease-off', 'slow-down', 'paused']
const KIND_ORDER: ChartKind[] = ['blank', 'ceiling', 'forecast', 'forecast-full', 'over', 'used', 'now', 'full']
const BRAILLE_BLANK = 0x2800
const BRAILLE_BITS = [
  [0x01, 0x08],
  [0x02, 0x10],
  [0x04, 0x20],
  [0x40, 0x80],
]
const DOTS_ACROSS = 2
const DOTS_DOWN = 4
const CEILING_EVERY_CELLS = 2
const NOW_MARK = '●'
const FULL_MARK = '✕'

export function windowName(kind: string): string {
  return WINDOW_NAMES[kind] ?? kind
}

export function windowLength(kind: string): number | null {
  return WINDOW_SPECS[kind]?.length ?? null
}

export function isUsageHistory(value: unknown): value is UsageHistory {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const history = value as Partial<UsageHistory>
  const hasSamples =
    Array.isArray(history.samples) &&
    history.samples.every(sample => typeof sample?.at === 'number' && typeof sample.percent === 'number')

  return typeof history.kind === 'string' && typeof history.resetsAt === 'number' && hasSamples
}

export function addSample(history: UsageHistory | null, kind: string, resetsAt: number, sample: UsageSample): UsageHistory {
  if (history === null || history.kind !== kind || history.resetsAt !== resetsAt) {
    return { kind, resetsAt, samples: [sample] }
  }
  const last = history.samples.at(-1)
  const isNews = last === undefined || last.percent !== sample.percent || sample.at - last.at >= HEARTBEAT_MS
  if (!isNews) {
    return history
  }

  return { ...history, samples: [...history.samples, sample].slice(-MAX_SAMPLES) }
}

function baselineOf(samples: UsageSample[], now: number, lookbackMs: number): UsageSample | null {
  const lookback = samples.findLast(sample => sample.at <= now - lookbackMs)
  if (lookback !== undefined) {
    return lookback
  }
  const first = samples[0]

  return first !== undefined && first.at <= now - MIN_HISTORY_MS ? first : null
}

export function percentPerHour(samples: UsageSample[], now: number, lookbackMs: number): number | null {
  const baseline = baselineOf(samples, now, lookbackMs)
  const current = samples.at(-1)
  if (baseline === null || current === undefined || current.at <= baseline.at) {
    return null
  }

  return ((current.percent - baseline.percent) / (now - baseline.at)) * HOUR_MS
}

export function fullAtOf(percent: number, perHour: number | null, now: number): number | null {
  if (perHour === null || perHour <= 0 || percent >= 100) {
    return null
  }

  return now + ((100 - percent) / perHour) * HOUR_MS
}

export function paceOf(percent: number, fullAt: number | null, resetsAt: number, now: number): Pace {
  if (percent >= 100) {
    return 'paused'
  }
  if (percent >= SLOW_DOWN_PERCENT) {
    return 'slow-down'
  }
  if (fullAt === null || fullAt >= resetsAt) {
    return 'on-pace'
  }

  return fullAt - now <= SLOW_DOWN_WITHIN_MS ? 'slow-down' : 'ease-off'
}

export function isWorsePace(pace: Pace, than: Pace): boolean {
  return PACE_ORDER.indexOf(pace) > PACE_ORDER.indexOf(than)
}

export function worstWindow(limits: LimitsView): LimitWindow | null {
  if (limits.windows.length === 0) {
    return null
  }

  return limits.windows.reduce((worst, window) => (isWorsePace(window.pace, worst.pace) ? window : worst))
}

export function paceOfLimits(limits: LimitsView): Pace | null {
  return worstWindow(limits)?.pace ?? null
}

export function limitWindowOf(history: UsageHistory, percent: number, now: number): LimitWindow | null {
  const spec = WINDOW_SPECS[history.kind]
  if (spec === undefined) {
    return null
  }
  const perHour = percentPerHour(history.samples, now, spec.paceLookback)
  const fullAt = fullAtOf(percent, perHour, now)

  return {
    kind: history.kind,
    percent,
    resetsAt: history.resetsAt,
    windowMs: spec.length,
    samples: history.samples,
    perHour,
    fullAt,
    pace: paceOf(percent, fullAt, history.resetsAt, now),
  }
}

function usedAt(samples: UsageSample[], time: number): number | null {
  return samples.findLast(sample => sample.at <= time)?.percent ?? null
}

function forecastAt(window: LimitWindow, now: number, time: number): number | null {
  if (window.perHour === null) {
    return null
  }

  return window.percent + (Math.max(0, window.perHour) * (time - now)) / HOUR_MS
}

export function reachesLimit(window: LimitWindow): window is LimitWindow & { fullAt: number } {
  return window.fullAt !== null && window.fullAt < window.resetsAt
}

function dotRowOf(percent: number, dotRows: number): number {
  const clamped = Math.max(0, Math.min(100, percent))

  return Math.round((1 - clamped / 100) * (dotRows - 1))
}

function plotDot(cells: ChartCell[][], x: number, y: number, kind: ChartKind) {
  const cell = cells[Math.floor(y / DOTS_DOWN)]?.[Math.floor(x / DOTS_ACROSS)]
  if (cell === undefined) {
    return
  }
  cell.bits |= BRAILLE_BITS[y % DOTS_DOWN]?.[x % DOTS_ACROSS] ?? 0
  if (KIND_ORDER.indexOf(kind) > KIND_ORDER.indexOf(cell.kind)) {
    cell.kind = kind
  }
}

function plotUsage(cells: ChartCell[][], window: LimitWindow, now: number, width: number) {
  const dotColumns = width * DOTS_ACROSS
  const dotRows = cells.length * DOTS_DOWN
  const start = window.resetsAt - window.windowMs
  const forecastKind: ChartKind = reachesLimit(window) ? 'forecast-full' : 'forecast'
  const nowX = Math.floor(((now - start) / window.windowMs) * dotColumns)
  let previousRow: number | null = null
  for (let x = 0; x < dotColumns; x += 1) {
    const time = start + ((x + 0.5) / dotColumns) * window.windowMs
    if (x > nowX) {
      const forecast = forecastAt(window, now, time)
      const isDottedGap = x % DOTS_ACROSS !== 0
      if (forecast !== null && !isDottedGap) {
        plotDot(cells, x, dotRowOf(forecast, dotRows), forecast >= 100 ? 'over' : forecastKind)
      }
      continue
    }
    const used = x === nowX ? window.percent : usedAt(window.samples, time)
    if (used === null) {
      previousRow = null
      continue
    }
    const row = dotRowOf(used, dotRows)
    const from = previousRow ?? row
    for (let y = Math.min(from, row); y <= Math.max(from, row); y += 1) {
      plotDot(cells, x, y, 'used')
    }
    previousRow = row
  }
}

function drawCeiling(cells: ChartCell[][]) {
  cells[0]?.forEach((cell, column) => {
    if (cell.bits === 0 && column % CEILING_EVERY_CELLS === 0) {
      cell.bits = BRAILLE_BITS[0]?.[0] ?? 0
      cell.kind = 'ceiling'
    }
  })
}

function placeMark(cells: ChartCell[][], row: number, column: number, mark: string, kind: ChartKind) {
  const cell = cells[row]?.[column]
  if (cell !== undefined) {
    cell.mark = mark
    cell.kind = kind
  }
}

function cellText(cell: ChartCell): string {
  if (cell.mark !== undefined) {
    return cell.mark
  }

  return cell.bits === 0 ? ' ' : String.fromCharCode(BRAILLE_BLANK + cell.bits)
}

function segmentsOf(row: ChartCell[]): Segment[] {
  const segments: Segment[] = []
  for (const cell of row) {
    const last = segments.at(-1)
    if (last?.kind === cell.kind) {
      last.text += cellText(cell)
    } else {
      segments.push({ text: cellText(cell), kind: cell.kind })
    }
  }

  return segments
}

export function chartRows(window: LimitWindow, now: number, width: number, rows: number): Segment[][] {
  const cells: ChartCell[][] = Array.from({ length: rows }, () => Array.from({ length: width }, () => ({ bits: 0, kind: 'blank' })))
  plotUsage(cells, window, now, width)
  drawCeiling(cells)
  const nowColumn = columnOf(window, now, width)
  if (reachesLimit(window) && columnOf(window, window.fullAt, width) !== nowColumn) {
    placeMark(cells, 0, columnOf(window, window.fullAt, width), FULL_MARK, 'full')
  }
  placeMark(cells, Math.floor(dotRowOf(window.percent, rows * DOTS_DOWN) / DOTS_DOWN), nowColumn, NOW_MARK, 'now')

  return cells.map(segmentsOf)
}

export function columnOf(window: LimitWindow, time: number, width: number): number {
  const start = window.resetsAt - window.windowMs
  const column = Math.floor(((time - start) / window.windowMs) * width)

  return Math.max(0, Math.min(width - 1, column))
}

export function axisSegments(labels: AxisLabel[], width: number): { text: string; isEmphasized: boolean }[] {
  const taken: ({ char: string; isEmphasized: boolean } | null)[] = Array.from({ length: width }, () => null)
  for (const label of labels) {
    const lastStart = width - label.text.length
    const start = label.isRightAligned === true ? lastStart : Math.min(label.column, lastStart)
    const end = start + label.text.length
    const isClear = start >= 0 && end <= width && taken.slice(Math.max(0, start - 1), end + 1).every(cell => cell === null)
    if (!isClear) {
      continue
    }
    for (let column = start; column < end; column += 1) {
      taken[column] = { char: label.text[column - start] ?? ' ', isEmphasized: label.isEmphasized }
    }
  }

  const segments: { text: string; isEmphasized: boolean }[] = []
  for (const cell of taken) {
    const char = cell?.char ?? ' '
    const isEmphasized = cell?.isEmphasized ?? false
    const last = segments.at(-1)
    if (last?.isEmphasized === isEmphasized) {
      last.text += char
    } else {
      segments.push({ text: char, isEmphasized })
    }
  }

  return segments
}

function clockTime(time: number): string {
  const date = new Date(time)

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function dayAndTime(time: number): string {
  const day = new Date(time).toLocaleDateString('en-US', { weekday: 'short' })

  return `${day} ${clockTime(time)}`
}

export function clockOrDay(time: number, now: number): string {
  return Math.abs(time - now) < DAY_MS ? clockTime(time) : dayAndTime(time)
}

export function duration(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / MINUTE_MS))
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 48) {
    return `${hours}h ${minutes % 60}m`
  }

  return `${Math.floor(hours / 24)}d ${hours % 24}h`
}

export function upcomingText(event: string, time: number, now: number): string {
  return `${event} ${clockOrDay(time, now)} (in ${duration(time - now)})`
}
