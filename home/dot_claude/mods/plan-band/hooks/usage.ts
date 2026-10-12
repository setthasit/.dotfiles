import type { LimitWindow, LimitsView, Pace, UsageHistory, UsageSample } from '../types'

export type ChartKind = 'used' | 'projected' | 'over' | 'unknown'

export type ChartCell = { value: number; kind: ChartKind }

export type Segment = { text: string; kind: ChartKind }

export type AxisLabel = { column: number; text: string; isEmphasized: boolean; isRightAligned?: boolean }

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const WINDOW_MS: Record<string, number> = { five_hour: 5 * HOUR_MS, seven_day: 7 * 24 * HOUR_MS }
const WINDOW_NAMES: Record<string, string> = { five_hour: '5h', seven_day: '7d', spend_limit: '$' }
const PACE_LOOKBACK_MS = 30 * MINUTE_MS
const MIN_HISTORY_MS = 5 * MINUTE_MS
const HEARTBEAT_MS = 5 * MINUTE_MS
const SLOW_DOWN_PERCENT = 90
const SLOW_DOWN_WITHIN_MS = 30 * MINUTE_MS
const MAX_SAMPLES = 500
const BLOCKS = [' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '█']
const PACE_ORDER: Pace[] = ['on-pace', 'ease-off', 'slow-down', 'paused']

export function windowName(kind: string): string {
  return WINDOW_NAMES[kind] ?? kind
}

export function windowLength(kind: string): number | null {
  return WINDOW_MS[kind] ?? null
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

function baselineOf(samples: UsageSample[], now: number): UsageSample | null {
  const lookback = samples.findLast(sample => sample.at <= now - PACE_LOOKBACK_MS)
  if (lookback !== undefined) {
    return lookback
  }
  const first = samples[0]

  return first !== undefined && first.at <= now - MIN_HISTORY_MS ? first : null
}

export function percentPerHour(samples: UsageSample[], now: number): number | null {
  const baseline = baselineOf(samples, now)
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

export function worstPace(paces: Pace[]): Pace | null {
  if (paces.length === 0) {
    return null
  }

  return paces.reduce((worst, pace) => (isWorsePace(pace, worst) ? pace : worst))
}

export function paceOfLimits(limits: LimitsView): Pace | null {
  return worstPace(limits.windows.map(window => window.pace))
}

export function limitWindowOf(history: UsageHistory, percent: number, now: number): LimitWindow | null {
  const windowMs = windowLength(history.kind)
  if (windowMs === null) {
    return null
  }
  const perHour = percentPerHour(history.samples, now)
  const fullAt = fullAtOf(percent, perHour, now)

  return {
    kind: history.kind,
    percent,
    resetsAt: history.resetsAt,
    windowMs,
    samples: history.samples,
    perHour,
    fullAt,
    pace: paceOf(percent, fullAt, history.resetsAt, now),
  }
}

function usedAt(samples: UsageSample[], time: number): number | null {
  return samples.findLast(sample => sample.at <= time)?.percent ?? null
}

export function chartCells(window: LimitWindow, now: number, width: number): ChartCell[] {
  const start = window.resetsAt - window.windowMs
  const step = window.windowMs / width
  const current = window.samples.at(-1)?.percent ?? window.percent

  return Array.from({ length: width }, (_, column) => {
    const time = start + (column + 0.5) * step
    if (time <= now) {
      const used = usedAt(window.samples, time)

      return used === null ? { value: 0, kind: 'unknown' } : { value: used, kind: 'used' }
    }
    if (window.perHour === null || window.perHour <= 0) {
      return { value: 0, kind: 'unknown' }
    }
    const projected = current + (window.perHour * (time - now)) / HOUR_MS

    return projected >= 100 ? { value: 100, kind: 'over' } : { value: projected, kind: 'projected' }
  })
}

function blockFor(value: number, row: number, rows: number): string {
  const band = 100 / rows
  const level = Math.round(((value - row * band) / band) * 8)

  return BLOCKS[Math.max(0, Math.min(8, level))] ?? ' '
}

export function chartRows(cells: ChartCell[], rows: number): Segment[][] {
  return Array.from({ length: rows }, (_, index) => {
    const row = rows - 1 - index
    const segments: Segment[] = []
    for (const cell of cells) {
      const char = cell.kind === 'unknown' && row === 0 ? '·' : blockFor(cell.value, row, rows)
      const last = segments.at(-1)
      if (last?.kind === cell.kind) {
        last.text += char
      } else {
        segments.push({ text: char, kind: cell.kind })
      }
    }

    return segments
  })
}

export function columnOf(window: LimitWindow, time: number, width: number): number {
  const start = window.resetsAt - window.windowMs

  return Math.floor(((time - start) / window.windowMs) * width)
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

export function clockTime(time: number): string {
  const date = new Date(time)

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function dayAndTime(time: number): string {
  const day = new Date(time).toLocaleDateString('en-US', { weekday: 'short' })

  return `${day} ${clockTime(time)}`
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

export function resetText(window: LimitWindow, now: number): string {
  const isWithinDay = window.resetsAt - now < 24 * HOUR_MS
  const when = isWithinDay ? clockTime(window.resetsAt) : dayAndTime(window.resetsAt)

  return `resets ${when} · in ${duration(window.resetsAt - now)}`
}
