const SECOND_MS = 1000
const MINUTE_MS = 60 * SECOND_MS
const HOUR_MS = 60 * MINUTE_MS

export function printable(text: string): string {
  return text.replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, ' ')
}

export function clipped(text: string, max: number): string {
  const chars = [...text]

  return chars.length <= max ? text : `${chars.slice(0, max - 1).join('')}…`
}

export function firstLine(text: string): string {
  return text.split('\n').find(line => line.trim().length > 0)?.trim() ?? ''
}

export function usd(amount: number): string {
  return `$${amount.toFixed(2)}`
}

export function tokenCount(count: number): string {
  if (count < 1000) {
    return String(Math.round(count))
  }
  if (count < 100_000) {
    return `${(count / 1000).toFixed(1)}k`
  }
  if (count < 1_000_000) {
    return `${Math.round(count / 1000)}k`
  }

  return `${(count / 1_000_000).toFixed(2)}M`
}

function twoDigits(value: number): string {
  return String(value).padStart(2, '0')
}

export function duration(ms: number): string {
  if (ms < 10 * SECOND_MS) {
    return `${(ms / SECOND_MS).toFixed(1)}s`
  }
  if (ms < MINUTE_MS) {
    return `${Math.round(ms / SECOND_MS)}s`
  }
  if (ms < HOUR_MS) {
    return `${Math.floor(ms / MINUTE_MS)}m${twoDigits(Math.floor((ms % MINUTE_MS) / SECOND_MS))}s`
  }

  return `${Math.floor(ms / HOUR_MS)}h${twoDigits(Math.floor((ms % HOUR_MS) / MINUTE_MS))}m`
}

export function clockTime(at: number): string {
  const date = new Date(at)

  return `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}:${twoDigits(date.getSeconds())}`
}

export function dayKey(at: number): string {
  const date = new Date(at)

  return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function dayLabel(day: string): string {
  const [, month = 0, date = 0] = day.split('-').map(Number)

  return `${MONTHS[month - 1] ?? '?'} ${date}`
}

export function percent(value: number): string {
  return `${Math.round(value)}%`
}
