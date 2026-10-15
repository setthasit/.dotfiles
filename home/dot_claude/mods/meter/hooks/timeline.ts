import type { EventKind, TimelineEvent, TimelineFilter } from '../types'
import { MAIN_ROLE } from './tally'
import { clipped, firstLine, printable } from './text'

export type TimelineStats = { count: number; p95Ms: number | null; slowest: TimelineEvent | null }

export const SLOW_MS = 10_000
const MAX_EVENTS = 300
const MAX_DETAIL_CHARS = 120
const DETAIL_FIELDS = ['command', 'file_path', 'path', 'pattern', 'url', 'query', 'description', 'prompt']
const AGENT_TOOL = 'Agent'
const MCP_PREFIX = 'mcp__'
const P95 = 0.95
const TIMED_KINDS = new Set<EventKind>(['tool', 'slow', 'failed'])

export function isAgentTool(tool: string): boolean {
  return tool === AGENT_TOOL
}

export function mcpServerOf(tool: string): string | null {
  if (!tool.startsWith(MCP_PREFIX)) {
    return null
  }
  const server = tool.slice(MCP_PREFIX.length).split('__')[0] ?? ''

  return server.length > 0 ? server : null
}

export function serverKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function callCount(calls: Readonly<Record<string, number>>, server: string): number {
  const key = serverKey(server)

  return Object.hasOwn(calls, key) ? (calls[key] ?? 0) : 0
}

export function toolLabel(tool: string): string {
  const server = mcpServerOf(tool)

  return server === null ? tool : `${server}:${tool.split('__').pop() ?? ''}`
}

export function detailOf(input: Readonly<Record<string, unknown>>): string {
  for (const field of DETAIL_FIELDS) {
    const value = input[field]
    if (typeof value === 'string' && value.trim().length > 0) {
      return clipped(printable(firstLine(value)).trim(), MAX_DETAIL_CHARS)
    }
  }

  return ''
}

export function toolKind(durationMs: number, isError: boolean): EventKind {
  if (isError) {
    return 'failed'
  }

  return durationMs >= SLOW_MS ? 'slow' : 'tool'
}

export function addEvent(events: TimelineEvent[], event: TimelineEvent): TimelineEvent[] {
  return [...events, event].slice(-MAX_EVENTS)
}

function isShown(event: TimelineEvent, filter: TimelineFilter): boolean {
  if (filter === 'slow') {
    return event.kind === 'slow'
  }
  if (filter === 'blocked') {
    return event.kind === 'blocked'
  }
  if (filter === 'main') {
    return event.agent === MAIN_ROLE
  }

  return true
}

export function filtered(events: TimelineEvent[], filter: TimelineFilter): TimelineEvent[] {
  return events.filter(event => isShown(event, filter))
}

export function timelineStats(events: TimelineEvent[]): TimelineStats {
  const timed = events.filter(event => TIMED_KINDS.has(event.kind) && event.durationMs !== null)
  if (timed.length === 0) {
    return { count: 0, p95Ms: null, slowest: null }
  }
  const sorted = [...timed].sort((a, b) => (a.durationMs ?? 0) - (b.durationMs ?? 0))
  const p95Index = Math.min(sorted.length - 1, Math.floor(sorted.length * P95))

  return { count: timed.length, p95Ms: sorted[p95Index]?.durationMs ?? null, slowest: sorted.at(-1) ?? null }
}

export const FILTER_ORDER: TimelineFilter[] = ['all', 'slow', 'blocked', 'main']

export function nextFilter(filter: TimelineFilter): TimelineFilter {
  return FILTER_ORDER[(FILTER_ORDER.indexOf(filter) + 1) % FILTER_ORDER.length] ?? 'all'
}
