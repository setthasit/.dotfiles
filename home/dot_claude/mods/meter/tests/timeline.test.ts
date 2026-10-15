import { describe, expect, test } from 'claude-code/testing'

import type { TimelineEvent } from '../types'
import { addEvent, detailOf, filtered, mcpServerOf, nextFilter, serverKey, timelineStats, toolKind, toolLabel } from '../hooks/timeline'

function event(kind: TimelineEvent['kind'], durationMs: number | null, agent = 'main'): TimelineEvent {
  return { at: 0, agent, family: null, kind, tool: 'Bash', detail: '', durationMs }
}

describe('timeline', () => {
  test('shows the first useful field of a tool input on one clean line', () => {
    expect(detailOf({ command: 'go test ./...\necho done' })).toBe('go test ./...')
    expect(detailOf({ file_path: '/work/a.go' })).toBe('/work/a.go')
    expect(detailOf({ command: 'echo \u001b[2Jhi' })).not.toContain('\u001b')
    expect(detailOf({ command: 'rm -rf \u202Etxt.exe\u200B' })).toBe('rm -rf  txt.exe')
    expect(detailOf({ other: 1 })).toBe('')
  })

  test('names slow and failed calls', () => {
    expect(toolKind(9_999, false)).toBe('tool')
    expect(toolKind(10_000, false)).toBe('slow')
    expect(toolKind(1, true)).toBe('failed')
  })

  test('filters by kind or by the main loop and cycles the filter', () => {
    const events = [event('tool', 1), event('slow', 20_000, 'task'), event('blocked', null)]
    expect(filtered(events, 'slow')).toHaveLength(1)
    expect(filtered(events, 'blocked')).toHaveLength(1)
    expect(filtered(events, 'main')).toHaveLength(2)
    expect(nextFilter('main')).toBe('all')
  })

  test('reports p95 and the slowest timed call', () => {
    const events = Array.from({ length: 20 }, (_, index) => event('tool', (index + 1) * 100))
    const stats = timelineStats([...events, event('blocked', null), event('done', 999_999)])
    expect(stats.count).toBe(20)
    expect(stats.p95Ms).toBe(2000)
    expect(stats.slowest?.durationMs).toBe(2000)
    expect(timelineStats([]).p95Ms).toBeNull()
  })

  test('keeps the last 300 events', () => {
    let events: TimelineEvent[] = []
    for (let index = 0; index < 310; index++) {
      events = addEvent(events, event('tool', index))
    }
    expect(events).toHaveLength(300)
    expect(events[0]?.durationMs).toBe(10)
  })

  test('reads the MCP server from a tool name', () => {
    expect(mcpServerOf('mcp__claude_ai_Notion__notion-search')).toBe('claude_ai_Notion')
    expect(mcpServerOf('Bash')).toBeNull()
    expect(serverKey('claude.ai Notion')).toBe(serverKey('claude_ai_Notion'))
    expect(toolLabel('mcp__context7__query-docs')).toBe('context7:query-docs')
  })
})
