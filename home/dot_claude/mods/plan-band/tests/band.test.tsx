import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { FsEntry, On } from 'claude-code'

import type { LimitsView, Pause } from '../types'
import type { BandActions, BandInput } from '../hooks/band'
import { drawBand, drawHiddenLine } from '../hooks/band'
import { drawPane } from '../hooks/pane'
import { parseLedger, parsePhaseOutline, parseStatus } from '../hooks/plan'
import { limitWindowOf } from '../hooks/usage'
import { LEDGER_DURING_FIX, PHASE_FILE, STATUS_OUTPUT } from './fixtures'

const ROOT = '/work/game'
const PLAN_DIR = `${ROOT}/document/still-got-it-demo`
const FILES: Record<string, string> = {
  [`${PLAN_DIR}/progress.md`]: LEDGER_DURING_FIX,
  [`${PLAN_DIR}/phase-11-dedicated-server.md`]: PHASE_FILE,
}
const STATUS_COMMAND =
  'python3 ~/.agents/skills/implementation-plan-creator/scripts/plan_check.py status document/still-got-it-demo'
const BAND = {
  plugin: 'plan-band',
  surface: 'terminal',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: true, maxRows: 20, bodyColumns: 180, scroll: { offset: 0, bodyRows: 20 }, view: {} },
} as const

function entry(name: string, kind: FsEntry['kind']): FsEntry {
  return { name, kind, size: 1, mtimeMs: 1, isLink: false }
}

describe('the band on a plan run', () => {
  test('draws phase, task and findings once a status call names the plan', async ($, on) => {
    const clock = mock.clock(on, { now: 1_000_000 })
    mock.store(on)
    on('session.usage', () => ({
      value: {
        startedAt: 0,
        context: { usedPercentage: 1 } as never,
        rateLimits: [{ kind: 'five_hour', percentUsed: 62, resetsAt: new Date(1_000_000 + 2 * 3_600_000).toISOString() }],
      },
    }))
    on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
      const { Box } = $.ui.resolve(e)

      return <Box key="engine-band" />
    })
    on('session.cwd', () => ({ value: ROOT }))
    on('session.repo', () => ({ value: null }))
    on('agent.list', () => ({ value: [] }))
    on('fs.stat', (_$, e) => {
      if (e.path === PLAN_DIR) {
        return { value: { kind: 'dir', size: 1, mtimeMs: 1, isLink: false } }
      }
      if (FILES[e.path] !== undefined) {
        return { value: { kind: 'file', size: 1, mtimeMs: 1, isLink: false } }
      }

      return { deny: `ENOENT ${e.path}` }
    })
    on('fs.read', (_$, e) => {
      const text = FILES[e.path]

      return text === undefined ? { deny: `ENOENT ${e.path}` } : { value: text }
    })
    on('fs.list', () => ({ value: [entry('progress.md', 'file'), entry('phase-11-dedicated-server.md', 'file')] }))
    on('tool.call', { tool: 'Bash' }, () => ({
      result: { stdout: STATUS_OUTPUT, stderr: '', interrupted: false },
      text: STATUS_OUTPUT,
    }))

    const before = await $.ui.mount(BAND)
    expect(await before.find({ key: 'engine-band' })).toBeDefined()
    await before.unmount()

    await $.tool.call({ tool: 'Bash', command: STATUS_COMMAND })

    await clock.advance(3000)
    const band = await $.ui.mount(BAND)
    expect(await band.find({ type: 'Text', text: /USAGE LIMITS/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /Phase 11 · Dedicated Server/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /3\.3 Admin console/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /94 needs fixes/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /3 findings logged this phase/ })).toBeDefined()

    await band.press({ key: 'hide' })
    expect(await band.find({ type: 'Text', text: /3 findings logged/ })).toBeUndefined()
    expect(await band.find({ type: 'Text', text: /Plan 11/ })).toBeDefined()
    await band.unmount()
  })
})

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const NOW = Date.UTC(2026, 9, 12, 4, 42)
const RESET = NOW + 2 * HOUR + 18 * MINUTE

function limitsAt(percent: number): LimitsView {
  const samples = [
    { at: RESET - 5 * HOUR, percent: 0 },
    { at: NOW - 30 * MINUTE, percent: percent - 18 },
    { at: NOW, percent },
  ]
  const fiveHour = limitWindowOf({ kind: 'five_hour', resetsAt: RESET, samples }, percent, NOW)
  const sevenDay = limitWindowOf({ kind: 'seven_day', resetsAt: NOW + 3 * 24 * HOUR, samples: [{ at: NOW, percent: 41 }] }, 41, NOW)

  return { computedAt: NOW, windows: [fiveHour, sevenDay].filter(window => window !== null) }
}

function inputWith(limits: LimitsView, pause: Pause | null): BandInput {
  return {
    tracking: { dir: PLAN_DIR, reason: 'status' },
    status: parseStatus(STATUS_OUTPUT),
    phase: parsePhaseOutline(PHASE_FILE),
    ledger: parseLedger(LEDGER_DURING_FIX, 11),
    agents: [
      { id: 'a1', parentId: null, type: 'coordinator', description: 'Run part 11.1', minutes: 41 },
      { id: 'a2', parentId: 'a1', type: 'task', description: 'Fix 3.3 findings', minutes: 6 },
    ],
    limits,
    pause,
    isAutoResumeOn: true,
    isWorking: false,
    isSettling: false,
    columns: 200,
    rows: 20,
  }
}

const NO_ACTIONS: BandActions = {
  onHide: () => undefined,
  onShow: () => undefined,
  onPane: () => undefined,
  onResume: () => undefined,
  onToggleAutoResume: () => undefined,
}

describe('drawing usage limits', () => {
  test('the wide band shows the limits card with its pace and chart', async ($, on) => {
    const input = inputWith(limitsAt(62), null)
    on('ui.render', { component: 'AbovePrompt' }, ($, e, next) =>
      e.surface === 'terminal' ? drawBand($.ui.resolve(e), input, NO_ACTIONS) : next(e),
    )

    const band = await $.ui.mount(BAND)
    expect(await band.find({ type: 'Text', text: /USAGE LIMITS/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /EASE OFF/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /full ~/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /7d/ })).toBeDefined()
    expect(await band.find({ key: 'resume' })).toBeUndefined()
    await band.unmount()
  })

  test('medium and narrow bands keep the pace verdict', async ($, on) => {
    let input = inputWith(limitsAt(62), null)
    on('ui.render', { component: 'AbovePrompt' }, ($, e, next) =>
      e.surface === 'terminal' ? drawBand($.ui.resolve(e), input, NO_ACTIONS) : next(e),
    )
    for (const columns of [120, 100]) {
      input = { ...input, columns }
      const band = await $.ui.mount(BAND)
      expect(await band.find({ type: 'Text', text: /EASE OFF/ })).toBeDefined()
      expect(await band.find({ type: 'Text', text: /3\.3 Admin console/ })).toBeDefined()
      await band.unmount()
    }
  })

  test('a paused band offers resume and auto-resume', async ($, on) => {
    const input = inputWith(limitsAt(100), { resetsAt: RESET, isRunOpen: true })
    on('ui.render', { component: 'AbovePrompt' }, ($, e, next) =>
      e.surface === 'terminal' ? drawBand($.ui.resolve(e), input, NO_ACTIONS) : next(e),
    )

    const band = await $.ui.mount(BAND)
    expect(await band.find({ type: 'Text', text: /PAUSED/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /2h 18m/ })).toBeDefined()
    expect(await band.find({ key: 'resume' })).toBeDefined()
    expect(await band.find({ key: 'auto-resume' })).toBeDefined()
    await band.unmount()
  })

  test('the hidden line names the window it shows', async ($, on) => {
    const sevenDayOnly = { ...limitsAt(62), windows: limitsAt(62).windows.filter(window => window.kind === 'seven_day') }
    const input = inputWith(sevenDayOnly, null)
    on('ui.render', { component: 'AbovePrompt' }, ($, e, next) =>
      e.surface === 'terminal' ? drawHiddenLine($.ui.resolve(e), input, NO_ACTIONS) : next(e),
    )

    const line = await $.ui.mount(BAND)
    expect(await line.find({ type: 'Text', text: /▲ 7d 41%/ })).toBeDefined()
    expect(await line.find({ type: 'Text', text: /5h/ })).toBeUndefined()
    await line.unmount()
  })

  test('the pane lists tasks, findings and the ledger', async ($, on) => {
    const input = inputWith(limitsAt(62), null)
    on('ui.render', { component: 'Pane', requestId: 'drawn-pane' }, ($, e, next) =>
      e.surface === 'terminal' ? drawPane($.ui.resolve(e), input) : next(e),
    )

    const pane = await $.ui.mount({
      plugin: 'plan-band',
      surface: 'terminal',
      component: 'Pane',
      requestId: 'drawn-pane',
      props: { title: 'Plan', isFocused: false, bodyColumns: 70, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
    })
    expect(await pane.find({ type: 'Text', text: /PHASE 11 · 1 OF 3/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /FOR YOU · 3 FINDINGS/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /LEDGER/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /coordinator/ })).toBeDefined()
    await pane.unmount()
  })
})

const PLAN_START = 1_000_000
const RESUME_RESET = PLAN_START + 30 * MINUTE
const ASKING_FOR_BRANCH = STATUS_OUTPUT.replace('state: run-part', 'state: ask-branch')
const RUNNING_AGENT = { id: 'a1', status: 'running', type: 'coordinator', description: 'Run part 11.1' } as never

function planWorld(on: On, files: Record<string, string> = FILES) {
  const clock = mock.clock(on, { now: PLAN_START })
  mock.store(on)
  const world = {
    clock,
    submitted: [] as string[],
    alertTitles: [] as string[],
    agents: [] as never[],
    statusOutput: STATUS_OUTPUT,
    rateLimits: [{ kind: 'five_hour', percentUsed: 100, resetsAt: new Date(RESUME_RESET).toISOString() }],
  }
  on('session.usage', () => ({ value: { startedAt: 0, context: {} as never, rateLimits: world.rateLimits } }))
  on('session.cwd', () => ({ value: ROOT }))
  on('session.repo', () => ({ value: null }))
  on('agent.list', () => ({ value: world.agents }))
  on('ui.notify', (_$, e) => {
    world.alertTitles.push(e.title ?? '')

    return { value: { isSent: true, channel: 'terminal_bell' } }
  })
  on('ui.toast', () => ({ value: undefined }))
  on('fs.stat', (_$, e) =>
    e.path === PLAN_DIR || files[e.path] !== undefined
      ? { value: { kind: e.path === PLAN_DIR ? 'dir' : 'file', size: 1, mtimeMs: 1, isLink: false } }
      : { deny: `ENOENT ${e.path}` },
  )
  on('fs.read', (_$, e) => (files[e.path] === undefined ? { deny: 'ENOENT' } : { value: files[e.path] ?? '' }))
  on('fs.list', () => ({ value: Object.keys(files).map(path => entry(path.slice(PLAN_DIR.length + 1), 'file')) }))
  on('prompt.submit', (_$, e) => {
    world.submitted.push(e.text)

    return { text: e.text }
  })
  on('tool.call', { tool: 'Bash' }, () => ({
    result: { stdout: world.statusOutput, stderr: '', interrupted: false },
    text: world.statusOutput,
  }))

  return world
}

async function pauseThenReset($: Engine, world: ReturnType<typeof planWorld>): Promise<void> {
  await $.tool.call({ tool: 'Bash', command: STATUS_COMMAND })
  await world.clock.advance(3000)
  world.rateLimits = []
  await world.clock.advance(RESUME_RESET - PLAN_START)
}

describe('a newly tracked plan', () => {
  test('keeps the branch and attention from the first status call', async ($, on) => {
    const world = planWorld(on)
    await $.tool.call({ tool: 'Bash', command: STATUS_COMMAND })
    await world.clock.advance(3000)

    const band = await $.ui.mount(BAND)
    expect(await band.find({ type: 'Text', text: /still-got-it-demo · feat\/dedicated-server/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /lint: 26 error/ })).toBeDefined()
    await band.unmount()
  })

  test('tells you when the first status call asks for an answer', async ($, on) => {
    const world = planWorld(on)
    world.rateLimits = []
    world.statusOutput = ASKING_FOR_BRANCH
    world.agents = [RUNNING_AGENT]
    await $.tool.call({ tool: 'Bash', command: STATUS_COMMAND })
    await world.clock.advance(3000)

    world.agents = []
    await world.clock.advance(3000)
    expect(world.alertTitles).toEqual(['Waiting on you'])
  })

  test('shows the phase named by the status before progress.md exists', async ($, on) => {
    const world = planWorld(on, { [`${PLAN_DIR}/phase-11-dedicated-server.md`]: PHASE_FILE })
    await $.tool.call({ tool: 'Bash', command: STATUS_COMMAND })
    await world.clock.advance(3000)

    const band = await $.ui.mount(BAND)
    expect(await band.find({ type: 'Text', text: /Phase 11 · Dedicated Server/ })).toBeDefined()
    await band.unmount()
  })

  test('/plan-band use tracks a plan that has no progress.md yet', async ($, on) => {
    planWorld(on, { [`${PLAN_DIR}/phase-11-dedicated-server.md`]: PHASE_FILE })
    const reply = await $.command.run({
      command: 'plan-band',
      args: 'use document/still-got-it-demo',
      origin: { kind: 'composer' },
      presentation: { isFullscreen: true, columns: 200 },
    })
    expect(reply.text).toBe(`Tracking ${PLAN_DIR}, from /plan-band use.`)
  })
})

describe('auto-resume', () => {
  test('asks the run to continue once, a minute after the limit resets', async ($, on) => {
    const world = planWorld(on)
    await pauseThenReset($, world)
    expect(world.submitted).toEqual([])
    world.rateLimits = [{ kind: 'five_hour', percentUsed: 100, resetsAt: new Date(RESUME_RESET).toISOString() }]

    await world.clock.advance(61_000)
    expect(world.submitted).toEqual([
      'The usage limit has reset. Continue the plan run, and resume any agent that stopped mid-work.',
    ])
    await world.clock.advance(5 * 60_000)
    expect(world.submitted).toHaveLength(1)
  })

  test('sends nothing when auto-resume is off', async ($, on) => {
    const world = planWorld(on)
    const reply = await $.command.run({
      command: 'plan-band',
      args: 'auto-resume off',
      origin: { kind: 'composer' },
      presentation: { isFullscreen: true, columns: 200 },
    })
    expect(reply.text).toBe('Auto-resume after a usage limit is off.')
    await pauseThenReset($, world)
    await world.clock.advance(5 * 60_000)
    expect(world.submitted).toEqual([])
  })
})
