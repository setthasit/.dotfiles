import { describe, expect, mock, test } from 'claude-code/testing'
import type { On, SessionMessage, TurnCompleteInput, TurnUsage } from 'claude-code'
import type { MockClock } from 'claude-code/testing'

const START = 600_000
const BAD_COMMIT = 'git commit -m "Added retry logic to the order sync job"'
const GOOD_COMMIT = 'git commit -m "[AI] add retry to order sync"'
const BAND = {
  plugin: 'meter',
  surface: 'terminal',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: true, maxRows: 20, bodyColumns: 180, scroll: { offset: 0, bodyRows: 20 }, view: {} },
} as const
const PANE = {
  plugin: 'meter',
  surface: 'terminal',
  component: 'Pane',
  requestId: 'meter',
  props: { title: 'Meter', isFocused: true, bodyColumns: 84, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
} as const

type World = {
  clock: MockClock
  bashRuns: number
  toasts: string[]
  statuses: string[]
  commands: string[]
  stored: Record<string, unknown>
  spawnedModel: string
  costUsd: number
  planTracking: unknown
  openedPanes: string[]
}

const BREAKDOWN = {
  totalTokens: 380_000,
  maxTokens: 1_000_000,
  categories: [
    { name: 'Messages', tokens: 330_000, kind: 'used', color: 'text', isDeferred: false },
    { name: 'Free space', tokens: 620_000, kind: 'free', color: 'text', isDeferred: false },
  ],
  mcpTools: [
    { name: 'mcp__notion__search', serverName: 'notion', tokens: 4100, isLoaded: true },
    { name: 'mcp__context7__query-docs', serverName: 'context7', tokens: 600, isLoaded: true },
  ],
}

function usage(model: string, input: number, cacheRead: number, output: number): TurnUsage {
  return { model, input_tokens: input, output_tokens: output, cache_read_input_tokens: cacheRead, cache_creation_input_tokens: 0 }
}

function turnDone(agentId: string | undefined, turnUsage: TurnUsage): TurnCompleteInput {
  return { answer: '', durationMs: 60_000, isAborted: false, turnId: 'turn-1', reason: 'answer', agentId, usage: turnUsage } as TurnCompleteInput
}

function meterWorld(on: On, beneath: 'empty' | 'plan' = 'empty'): World {
  const world: World = {
    clock: mock.clock(on, { now: START }),
    bashRuns: 0,
    toasts: [],
    statuses: [],
    commands: [],
    stored: {},
    spawnedModel: 'claude-sonnet-5-5',
    costUsd: 1.5,
    planTracking: undefined,
    openedPanes: [],
  }
  on('store.get', (_$, e) => ({ value: world.stored[e.key] }))
  on('store.set', (_$, e) => {
    world.stored[e.key] = e.value

    return { value: undefined }
  })
  on('store.delete', (_$, e) => {
    delete world.stored[e.key]

    return { value: undefined }
  })
  on('session.usage', (_$, e) => ({
    value: {
      startedAt: 0,
      context: { window: 1_000_000, breakdown: e?.breakdown === undefined ? undefined : BREAKDOWN } as never,
      rateLimits: [],
      cost: { usd: world.costUsd },
    },
  }))
  on('state.get', (_$, e, next) => ((e as { plugin: string }).plugin === 'plan-band' ? { value: { value: world.planTracking, version: 1 } } : next(e)))
  on('command.register', (_$, e) => {
    world.commands.push(e.name)

    return { value: { command: e.name } }
  })
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('session.id', () => ({ value: 'session-1' }))
  on('ui.toast', (_$, e) => {
    world.toasts.push(e.text)

    return { value: undefined }
  })
  on('tool.call', { tool: 'Bash' }, () => {
    world.bashRuns += 1

    return { result: { stdout: '', stderr: '', interrupted: false }, text: '' }
  })
  on('agent.spawn', () => ({ model: world.spawnedModel, agentId: 'agent-1' }))
  on('turn.complete', (_$, e) => ({ text: e.answer, usage: e.usage }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
  on('ui.status', (_$, e) => {
    world.statuses.push(e.text ?? '')

    return { value: undefined }
  })
  on('ui.open', (_$, e) => {
    world.openedPanes.push(e.id)

    return { value: { isPlaced: true } }
  })
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box, Text } = $.ui.resolve(e)

    return beneath === 'plan' ? (
      <Box key="plan-stub">
        <Text>PLAN BAND</Text>
      </Box>
    ) : (
      <Box key="engine-band" />
    )
  })

  return world
}

describe('guards', () => {
  test('a commit subject without [AI] is refused before it runs, a good one runs', async ($, on) => {
    const world = meterWorld(on)

    const blocked = await $.tool.call({ tool: 'Bash', command: BAD_COMMIT })
    expect(blocked.deny).toContain('commit-message')
    expect(world.bashRuns).toBe(0)

    const passed = await $.tool.call({ tool: 'Bash', command: GOOD_COMMIT })
    expect(passed.deny).toBeUndefined()
    expect(world.bashRuns).toBe(1)
  })

  test('the Monitor tool gets the same command guard', async ($, on) => {
    meterWorld(on)
    let monitorRuns = 0
    on('tool.call', { tool: 'Monitor' }, () => {
      monitorRuns += 1

      return { result: {}, text: '' } as never
    })

    const blocked = await $.tool.call({ tool: 'Monitor', description: 'push', timeout_ms: 1000, command: 'git push -f origin feat' } as never)
    expect(blocked.deny).toContain('no-bypass')
    expect(monitorRuns).toBe(0)
  })

  test('a force push is refused', async ($, on) => {
    const world = meterWorld(on)

    const blocked = await $.tool.call({ tool: 'Bash', command: 'git push --force origin feat/retry' })
    expect(blocked.deny).toContain('no-bypass')
    expect(world.bashRuns).toBe(0)
  })

  test('the guard option off lets the same commit through', { options: { guards: false } }, async ($, on) => {
    const world = meterWorld(on)

    const passed = await $.tool.call({ tool: 'Bash', command: BAD_COMMIT })
    expect(passed.deny).toBeUndefined()
    expect(world.bashRuns).toBe(1)
  })

  test('a spawn that passes model is refused, one without it starts', async ($, on) => {
    meterWorld(on)

    const denied = await $.agent.spawn({ prompt: 'drive the CLI', description: 'Drive the sync CLI', subagentType: 'tester', model: 'haiku' } as never)
    expect(denied.deny).toContain('role-pin')

    const started = await $.agent.spawn({ prompt: 'drive the CLI', description: 'Drive the sync CLI', subagentType: 'tester' } as never)
    expect(started.deny).toBeUndefined()
  })

  test('blocks of a turn raise one toast when the main turn ends', async ($, on) => {
    const world = meterWorld(on)

    await $.tool.call({ tool: 'Bash', command: BAD_COMMIT })
    await $.tool.call({ tool: 'Bash', command: 'git push -f' })
    await $.turn.complete(turnDone(undefined, usage('claude-opus-5-5', 100, 900, 50)))

    expect(world.toasts).toContain('meter · 2 calls blocked: commit-message 1 · no-bypass 1')
    expect(world.statuses.at(-1)).toBe('meter · cache 90%')
  })
})

describe('the band', () => {
  test('stays away until there is something to count', async ($, on) => {
    meterWorld(on)

    const band = await $.ui.mount(BAND)
    expect(await band.find({ key: 'engine-band' })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /meter/ })).toBeUndefined()
    await band.unmount()
  })

  test('lists running agents, cache and spend when nothing else draws there', async ($, on) => {
    meterWorld(on)
    await $.agent.spawn({ prompt: 'drive the CLI', description: 'Drive the sync CLI', subagentType: 'tester' } as never)
    await $.turn.complete(turnDone(undefined, usage('claude-opus-5-5', 100, 900, 50)))

    const band = await $.ui.mount(BAND)
    expect(await band.find({ type: 'Text', text: /◎ meter/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /tester/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /90%/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /\$1\.50/ })).toBeDefined()
    expect(await band.find({ key: 'meter-pane' })).toBeDefined()
    await band.unmount()
  })

  test('sits under a plan band and leaves the agent list to it', async ($, on) => {
    meterWorld(on, 'plan')
    await $.agent.spawn({ prompt: 'drive the CLI', description: 'Drive the sync CLI', subagentType: 'tester' } as never)
    await $.turn.complete(turnDone(undefined, usage('claude-opus-5-5', 100, 900, 50)))

    const band = await $.ui.mount(BAND)
    expect(await band.find({ key: 'plan-stub' })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /PLAN BAND/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /◎ meter/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /tester/ })).toBeUndefined()
    await band.unmount()
  })
})

describe('the pane', () => {
  test('tallies a finished subagent by role and switches tabs', async ($, on) => {
    meterWorld(on)
    await $.agent.spawn({ prompt: 'drive the CLI', description: 'Drive the sync CLI', subagentType: 'tester' } as never)
    await $.turn.complete(turnDone('agent-1', usage('claude-sonnet-5-5', 1000, 3000, 200)))
    await $.turn.complete(turnDone(undefined, usage('claude-opus-5-5', 100, 900, 50)))
    await $.tool.call({ tool: 'Bash', command: BAD_COMMIT })

    const pane = await $.ui.mount(PANE)
    expect(await pane.find({ type: 'Text', text: /COST BY ROLE/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /tester/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /sonnet/ })).toBeDefined()

    await pane.press({ key: 'tab-timeline' })
    expect(await pane.find({ type: 'Text', text: /✕ Bash/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /✓ Done/ })).toBeDefined()

    await pane.press({ key: 'tab-guards' })
    expect(await pane.find({ type: 'Text', text: /RECENT BLOCKS/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /Added retry logic/ })).toBeDefined()
    await pane.unmount()
  })

  test('a session end stores the session and History shows it', async ($, on) => {
    const world = meterWorld(on)
    await $.turn.complete(turnDone(undefined, usage('claude-opus-5-5', 100, 900, 50)))
    await $.session.end({ reason: 'other', sessionId: 'session-1' } as never)

    expect(world.stored.history).toMatchObject({ version: 1, sessions: [{ id: `session-1@${START}`, usd: 1.5 }] })

    await $.command.run({ command: 'meter', args: 'history today' } as never)
    const pane = await $.ui.mount(PANE)
    expect(await pane.find({ type: 'Text', text: /SPEND/ })).toBeDefined()
    expect((await pane.find({ key: 'range' }))?.text).toBe('range · today')
    await pane.unmount()
  })

  test('a store written by a newer format is never overwritten', async ($, on) => {
    const world = meterWorld(on)
    world.stored.history = { version: 2, sessions: ['kept'] }
    await $.turn.complete(turnDone(undefined, usage('claude-opus-5-5', 100, 900, 50)))
    await $.session.end({ reason: 'other', sessionId: 'session-1' } as never)

    expect(world.stored.history).toEqual({ version: 2, sessions: ['kept'] })
  })

  test('reset asks first, then deletes the stored history', async ($, on) => {
    const world = meterWorld(on)
    await $.turn.complete(turnDone(undefined, usage('claude-opus-5-5', 100, 900, 50)))
    await $.session.end({ reason: 'other', sessionId: 'session-1' } as never)

    const asked = await $.command.run({ command: 'meter', args: 'reset' } as never)
    expect(asked.text).toBe('This deletes 1 stored sessions. Run /meter reset confirm to delete them.')
    expect(world.stored.history).toBeDefined()

    const done = await $.command.run({ command: 'meter', args: 'reset confirm' } as never)
    expect(done.text).toBe('Deleted 1 stored sessions.')
    expect(world.stored.history).toBeUndefined()

    await $.command.run({ command: 'meter', args: 'history' } as never)
    const pane = await $.ui.mount(PANE)
    expect(await pane.find({ type: 'Text', text: /No stored sessions in this range yet/ })).toBeDefined()
    await pane.unmount()
  })

  test('a running agent shows the context its last request carried', async ($, on) => {
    meterWorld(on)
    on('turn.step', async function* (_$, e) {
      return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'tool_use', usage: usage('claude-sonnet-5-5', 2000, 40_000, 300) }
    })
    await $.agent.spawn({ prompt: 'drive the CLI', description: 'Drive the sync CLI', subagentType: 'tester' } as never)

    const before = await $.ui.mount(PANE)
    expect(await before.find({ type: 'Text', text: /CONTEXT/ })).toBeDefined()
    expect(await before.find({ type: 'Text', text: /42\.0k/ })).toBeUndefined()
    await before.unmount()

    const step = $.turn.step({ turnId: 'turn-1', index: 0, model: 'claude-sonnet-5-5', messageCount: 3, agentId: 'agent-1' })
    let read = await step.next()
    while (read.done !== true) {
      read = await step.next()
    }
    const after = await $.ui.mount(PANE)
    expect(await after.find({ type: 'Text', text: /42\.0k/ })).toBeDefined()
    await after.unmount()
  })

  test('the cache chart spans the pane width', async ($, on) => {
    meterWorld(on)
    await $.turn.complete(turnDone(undefined, usage('claude-opus-5-5', 100, 900, 50)))
    await $.turn.complete(turnDone(undefined, usage('claude-opus-5-5', 100, 900, 50)))

    const pane = await $.ui.mount(PANE)
    expect(await pane.find({ type: 'Text', text: /^█{84}$/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /turn 2/ })).toBeDefined()
    await pane.unmount()
  })

  test('the Context tab lists what fills the window and MCP servers with no calls', async ($, on) => {
    meterWorld(on)
    on('tool.call', { tool: 'mcp__context7__query-docs' as never }, () => ({ result: {}, text: '' }) as never)
    await $.tool.call({ tool: 'mcp__context7__query-docs', query: 'react' } as never)
    await $.turn.complete(turnDone(undefined, usage('claude-opus-5-5', 100, 900, 50)))

    await $.command.run({ command: 'meter', args: 'context' } as never)
    const pane = await $.ui.mount(PANE)
    expect(await pane.find({ type: 'Text', text: /380k/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /Messages/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /Free space/ })).toBeUndefined()
    expect(await pane.find({ type: 'Text', text: /notion had no calls this session/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /context7 had no calls/ })).toBeUndefined()
    await pane.unmount()
  })
})

describe('the session', () => {
  test('startup registers /meter and the ticker moves running agent times', async ($, on) => {
    const world = meterWorld(on)
    await $.session.start({ cwd: '/work', surface: 'terminal' } as never)
    expect(world.commands).toContain('meter')

    await $.agent.spawn({ prompt: 'drive the CLI', description: 'Drive the sync CLI', subagentType: 'tester' } as never)
    await $.turn.complete(turnDone(undefined, usage('claude-opus-5-5', 100, 900, 50)))
    const band = await $.ui.mount(BAND)
    expect(await band.find({ type: 'Text', text: /0\.0s/ })).toBeDefined()

    await world.clock.advance(30_000)
    expect(await band.find({ type: 'Text', text: /30s/ })).toBeDefined()
    await band.unmount()
  })

  test('an interactive start opens the pane once, and a reload leaves it to the person', async ($, on) => {
    const world = meterWorld(on)
    await $.session.start({ cwd: '/work', surface: 'terminal', isInteractive: true })
    await $.session.start({ cwd: '/work', surface: 'terminal', isInteractive: true })
    expect(world.openedPanes).toEqual(['meter'])
  })

  test('a start with no person at the prompt opens no pane', async ($, on) => {
    const world = meterWorld(on)
    await $.session.start({ cwd: '/work', surface: null, isInteractive: false })
    expect(world.openedPanes).toEqual([])
  })

  test('the open-at-start option off opens no pane', { options: { openPaneAtStart: false } }, async ($, on) => {
    const world = meterWorld(on)
    await $.session.start({ cwd: '/work', surface: 'terminal', isInteractive: true })
    expect(world.openedPanes).toEqual([])
  })

  test('a tracked plan hides the agent list even when plan-band draws outside meter', async ($, on) => {
    const world = meterWorld(on)
    world.planTracking = { dir: '/work/.plans/order-sync', reason: 'status' }
    await $.agent.spawn({ prompt: 'drive the CLI', description: 'Drive the sync CLI', subagentType: 'tester' } as never)
    await $.turn.complete(turnDone(undefined, usage('claude-opus-5-5', 100, 900, 50)))

    const band = await $.ui.mount(BAND)
    expect(await band.find({ type: 'Text', text: /◎ meter/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /tester/ })).toBeUndefined()
    await band.unmount()
  })

  test('a compaction counts and raises a toast', async ($, on) => {
    const world = meterWorld(on)
    const summary: SessionMessage = { role: 'user', text: 'summary', toolUses: [] }
    on('session.compact', () => ({ messages: [summary], tokensBefore: 412_000, tokensAfter: 58_000 }))

    await $.session.compact({ trigger: 'manual', messages: [summary, summary] } as never)
    expect(world.toasts).toContain('meter · context compacted. 412k → 58.0k tokens. Session totals kept.')
  })

  test('the budget toast fires once', { options: { budgetUsd: 1 } }, async ($, on) => {
    const world = meterWorld(on)
    await $.turn.complete(turnDone(undefined, usage('claude-opus-5-5', 100, 900, 50)))
    world.costUsd = 2
    await $.turn.complete(turnDone(undefined, usage('claude-opus-5-5', 100, 900, 50)))

    expect(world.toasts.filter(text => text.includes('budget'))).toEqual(['meter · session spend passed the $1.00 budget ($1.50).'])
  })

  test('the low-cache note skips the cold first turn', async ($, on) => {
    meterWorld(on)
    await $.turn.complete(turnDone(undefined, usage('claude-opus-5-5', 900, 100, 50)))
    const first = await $.ui.mount(PANE)
    expect(await first.find({ type: 'Text', text: /Turn 1 hit/ })).toBeUndefined()
    await first.unmount()

    await $.turn.complete(turnDone(undefined, usage('claude-opus-5-5', 800, 200, 50)))
    const second = await $.ui.mount(PANE)
    expect(await second.find({ type: 'Text', text: /Turn 2 hit 20%/ })).toBeDefined()
    await second.unmount()
  })

  test('the cost card measures spend against the budget', { options: { budgetUsd: 3 } }, async ($, on) => {
    meterWorld(on)
    await $.turn.complete(turnDone(undefined, usage('claude-opus-5-5', 100, 900, 50)))

    const pane = await $.ui.mount(PANE)
    expect(await pane.find({ type: 'Text', text: /50% of \$3\.00 budget/ })).toBeDefined()
    await pane.unmount()
  })

  test('without a budget the rate card says none is set', async ($, on) => {
    meterWorld(on)
    await $.turn.complete(turnDone(undefined, usage('claude-opus-5-5', 100, 900, 50)))

    const pane = await $.ui.mount(PANE)
    expect(await pane.find({ type: 'Text', text: /no budget set/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /budget in ~/ })).toBeUndefined()
    await pane.unmount()
  })

  test('a resumed session takes its cost base at the next turn start', async ($, on) => {
    const world = meterWorld(on)
    world.costUsd = 0
    await $.session.start({ cwd: '/work', surface: 'terminal' } as never)
    world.costUsd = 1.5
    await $.turn.complete(turnDone(undefined, usage('claude-opus-5-5', 100, 900, 50)))
    await world.clock.advance(60_000)
    await $.session.end({ reason: 'resume', sessionId: 'session-1' } as never)

    world.costUsd = 3
    await $.turn.start({ text: 'next', turnId: 'turn-2' } as never)
    world.costUsd = 3.4
    await $.turn.complete(turnDone(undefined, usage('claude-opus-5-5', 10, 90, 5)))
    await $.session.end({ reason: 'other', sessionId: 'session-2' } as never)

    const stored = world.stored.history as { sessions: { usd: number }[] }
    expect(stored.sessions.map(session => Math.round(session.usd * 100))).toEqual([150, 40])
  })

  test('an agent resumed for a second run keeps its role', async ($, on) => {
    meterWorld(on)
    await $.agent.spawn({ prompt: 'drive the CLI', description: 'Drive the sync CLI', subagentType: 'tester' } as never)
    await $.turn.complete(turnDone('agent-1', usage('claude-sonnet-5-5', 1000, 3000, 200)))
    await $.turn.complete(turnDone('agent-1', usage('claude-sonnet-5-5', 500, 1500, 100)))
    await $.turn.complete(turnDone(undefined, usage('claude-opus-5-5', 100, 900, 50)))

    const pane = await $.ui.mount(PANE)
    expect(await pane.find({ type: 'Text', text: /tester/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /^● agent$/ })).toBeUndefined()
    await pane.unmount()
  })

  test('an agent resumed without a spawn is named from the engine list', async ($, on) => {
    meterWorld(on)
    on('agent.list', () => ({ value: [{ id: 'agent-old', type: 'coordinator', description: 'Run part 15.1', status: 'running' }] as never }))
    await $.turn.complete(turnDone('agent-old', usage('claude-opus-5-5', 1000, 3000, 200)))
    await $.turn.complete(turnDone(undefined, usage('claude-opus-5-5', 100, 900, 50)))

    const pane = await $.ui.mount(PANE)
    expect(await pane.find({ type: 'Text', text: /coordinator/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /^● agent$/ })).toBeUndefined()
    await pane.unmount()
  })

  test('an agent no list names keeps the agent label', async ($, on) => {
    meterWorld(on)
    on('agent.list', () => ({ value: [] }))
    await $.turn.complete(turnDone('agent-fork', usage('claude-opus-5-5', 1000, 3000, 200)))
    await $.turn.complete(turnDone(undefined, usage('claude-opus-5-5', 100, 900, 50)))

    const pane = await $.ui.mount(PANE)
    expect(await pane.find({ type: 'Text', text: /^● agent$/ })).toBeDefined()
    await pane.unmount()
  })

  test('an agent woken for another turn shows as running again', async ($, on) => {
    meterWorld(on)
    await $.agent.spawn({ prompt: 'drive the CLI', description: 'Drive the sync CLI', subagentType: 'tester' } as never)
    await $.turn.complete(turnDone('agent-1', usage('claude-sonnet-5-5', 1000, 3000, 200)))
    await $.turn.complete(turnDone(undefined, usage('claude-opus-5-5', 100, 900, 50)))

    const idle = await $.ui.mount(BAND)
    expect(await idle.find({ type: 'Text', text: /tester/ })).toBeUndefined()
    await idle.unmount()

    await $.tool.call({ tool: 'Bash', command: 'ls', agentId: 'agent-1' } as never)
    const woken = await $.ui.mount(BAND)
    expect(await woken.find({ type: 'Text', text: /tester/ })).toBeDefined()
    await woken.unmount()
  })

  test('clear stores the old segment and the next one counts only its own turns', async ($, on) => {
    const world = meterWorld(on)
    await $.session.start({ cwd: '/work', surface: 'terminal' } as never)
    await $.turn.complete(turnDone(undefined, usage('claude-opus-5-5', 100, 900, 50)))
    await world.clock.advance(60_000)
    await $.session.end({ reason: 'clear', sessionId: 'session-1' } as never)

    world.costUsd = 0.1
    await $.turn.start({ text: 'next', turnId: 'turn-2' } as never)
    world.costUsd = 0.6
    await $.turn.complete(turnDone(undefined, usage('claude-opus-5-5', 10, 90, 5)))
    await $.session.end({ reason: 'other', sessionId: 'session-1' } as never)

    const stored = world.stored.history as { sessions: { usd: number; roles: { tokens: number }[] }[] }
    expect(stored.sessions).toHaveLength(2)
    expect(stored.sessions[1]?.usd).toBe(0.5)
    expect(stored.sessions[1]?.roles[0]?.tokens).toBe(105)
  })
})
