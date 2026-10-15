import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { AgentView, LimitWindow, PlanStatus, Tracking, TrackingReason, UsageHistory } from '../types'
import { alertsBetween, donePartsOf } from './alerts'
import type { BandActions, BandInput } from './band'
import { drawBand, drawHiddenLine } from './band'
import { chipKindOf } from './chip'
import { drawPane } from './pane'
import {
  findPlanDirInCommand,
  isPlanFileName,
  latestStartedPhase,
  mentionedPaths,
  parseLedger,
  parsePhaseOutline,
  parseStatus,
  phaseFileFor,
  printable,
} from './plan'
import { addSample, isUsageHistory, limitWindowOf, paceOfLimits, windowLength } from './usage'

const tracking = atom({ plugin: 'plan-band', key: 'tracking' } as const, null)
const status = atom({ plugin: 'plan-band', key: 'status' } as const, null)
const phase = atom({ plugin: 'plan-band', key: 'phase' } as const, null)
const ledger = atom({ plugin: 'plan-band', key: 'ledger' } as const, null)
const agents = atom({ plugin: 'plan-band', key: 'agents' } as const, [])
const isHidden = atom({ plugin: 'plan-band', key: 'isHidden' } as const, false)
const isTurnRunning = atom({ plugin: 'plan-band', key: 'isTurnRunning' } as const, false)
const limits = atom({ plugin: 'plan-band', key: 'limits' } as const, null)
const isAutoResumeOn = atom({ plugin: 'plan-band', key: 'isAutoResumeOn' } as const, true)
const pause = atom({ plugin: 'plan-band', key: 'pause' } as const, null)
const alertSnapshot = atom({ plugin: 'plan-band', key: 'alertSnapshot' } as const, null)
const hasOpenedPaneAtStart = atom({ plugin: 'plan-band', key: 'hasOpenedPaneAtStart' } as const, false)

const REFRESH_MS = 3000
const LIMITS_REDRAW_MS = 60_000
const RECENTLY_ACTIVE_MS = 10 * 60_000
const RESUME_GRACE_MS = 60_000
const STOP_GRACE_MS = 2 * 60_000
const PANE_ID = 'plan-band'
const PANE_COLUMNS = 72
const LEDGER_FILE = 'progress.md'
const ACTIVE_AGENT_STATUSES = new Set(['pending', 'running', 'waiting'])
const WINDOW_ORDER = ['five_hour', 'seven_day']
const RESUME_PROMPT = 'The usage limit has reset. Continue the plan run, and resume any agent that stopped mid-work.'
const REASON_TEXT: Record<TrackingReason, string> = {
  status: 'a plan_check.py status call',
  mention: 'a plan named in your prompt',
  use: '/plan-band use',
}
const USAGE =
  'Usage: /plan-band [use <plan dir> | pane | hide | show | resume | auto-resume on | auto-resume off]'

const seenFiles = new Map<string, number>()
const agentFirstSeen = new Map<string, number>()
const usageHistories = new Map<string, UsageHistory>()
let lastActiveAt = 0
let lastLimitsDrawAt = 0
let ticker: Timer | null = null

function dirname(path: string): string {
  const slash = path.lastIndexOf('/')

  return slash <= 0 ? '.' : path.slice(0, slash)
}

function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

function joinPath(base: string, path: string): string {
  return path.startsWith('/') ? path : `${base}/${path}`
}

async function expandHome($: EngineInterface, path: string): Promise<string> {
  if (!path.startsWith('~/')) {
    return path
  }
  const home = await $.env.get('HOME')

  return home === undefined ? path : `${home}${path.slice(1)}`
}

async function kindOf($: EngineInterface, path: string): Promise<string | null> {
  try {
    return (await $.fs.stat(path)).kind
  } catch {
    return null
  }
}

async function isDirectory($: EngineInterface, path: string): Promise<boolean> {
  return (await kindOf($, path)) === 'dir'
}

async function candidateDirs($: EngineInterface, rawDir: string, rawCdDir: string | null): Promise<string[]> {
  const repo = await $.session.repo()
  const dir = await expandHome($, rawDir)
  const relativeBases = rawCdDir === null ? [] : [await expandHome($, rawCdDir)]
  const bases = [await $.session.cwd(), ...(repo === null ? [] : [repo.root])]

  return [
    ...relativeBases.flatMap(cd => bases.map(base => joinPath(joinPath(base, cd), dir))),
    ...bases.map(base => joinPath(base, dir)),
  ]
}

async function firstExistingDir($: EngineInterface, candidates: string[]): Promise<string | null> {
  for (const candidate of candidates) {
    if (await isDirectory($, candidate)) {
      return candidate
    }
  }

  return null
}

async function planDirOfPath($: EngineInterface, path: string): Promise<string | null> {
  const resolved = await firstExistingDir($, await candidateDirs($, path, null))
  if (resolved !== null) {
    const names = (await $.fs.list(resolved)).map(entry => entry.name)

    return names.some(isPlanFileName) ? resolved : null
  }
  if (!isPlanFileName(basename(path))) {
    return null
  }

  return firstExistingDir($, await candidateDirs($, dirname(path), null))
}

function ensureTicking($: EngineInterface): void {
  if (ticker !== null) {
    return
  }
  ticker = $.clock.every(REFRESH_MS, () => {
    // A plan file read mid-write can fail; the next tick reads it again.
    refresh($).catch(() => undefined)
  })
}

async function track($: EngineInterface, dir: string, reason: TrackingReason, planStatus?: PlanStatus): Promise<void> {
  ensureTicking($)
  const current = await read($, tracking)
  if (current?.dir !== dir) {
    seenFiles.clear()
    await update($, status, () => null)
    await update($, phase, () => null)
    await update($, ledger, () => null)
    await update($, alertSnapshot, () => null)
  }
  if (planStatus !== undefined) {
    await update($, status, () => planStatus)
  }
  await update($, tracking, () => ({ dir, reason }))
  await refreshFiles($)
}

async function changedText($: EngineInterface, path: string): Promise<string | null> {
  const { mtimeMs } = await $.fs.stat(path)
  if (seenFiles.get(path) === mtimeMs) {
    return null
  }
  const text = await $.fs.read(path)
  seenFiles.set(path, mtimeMs)

  return text
}

async function readLedger($: EngineInterface, path: string): Promise<{ text: string; isChanged: boolean }> {
  if ((await kindOf($, path)) !== 'file') {
    return { text: '', isChanged: false }
  }
  const changed = await changedText($, path)
  if (changed === null) {
    return { text: await $.fs.read(path), isChanged: false }
  }

  return { text: changed, isChanged: true }
}

async function phaseFileOf($: EngineInterface, dir: string, planStatus: PlanStatus | null, ledgerText: string) {
  if (planStatus?.phaseFile !== null && planStatus?.phaseFile !== undefined) {
    return `${dir}/${planStatus.phaseFile}`
  }
  const phaseNumber = latestStartedPhase(ledgerText)
  if (phaseNumber === null) {
    return null
  }
  const name = phaseFileFor(phaseNumber, (await $.fs.list(dir)).map(entry => entry.name))

  return name === null ? null : `${dir}/${name}`
}

async function refreshFiles($: EngineInterface): Promise<void> {
  const current = await read($, tracking)
  if (current === null) {
    return
  }
  const planStatus = await read($, status)
  const ledgerFile = await readLedger($, `${current.dir}/${LEDGER_FILE}`)
  const phasePath = await phaseFileOf($, current.dir, planStatus, ledgerFile.text)

  const phaseText = phasePath === null ? null : await changedText($, phasePath)
  if (phaseText !== null) {
    await update($, phase, () => parsePhaseOutline(phaseText))
  }
  if (ledgerFile.isChanged || phaseText !== null) {
    const phaseNumber = planStatus?.phaseNumber ?? (await read($, phase))?.number ?? null
    await update($, ledger, () => parseLedger(ledgerFile.text, phaseNumber))
  }
}

async function refreshAgents($: EngineInterface, now: number): Promise<void> {
  const active = (await $.agent.list()).filter(agent => ACTIVE_AGENT_STATUSES.has(agent.status))
  if (active.length > 0) {
    lastActiveAt = now
  }
  const views: AgentView[] = active.map(agent => {
    const firstSeen = agentFirstSeen.get(agent.id) ?? now
    agentFirstSeen.set(agent.id, firstSeen)

    return {
      id: agent.id,
      parentId: agent.parentId ?? null,
      type: printable(agent.type),
      description: printable(agent.description),
      minutes: Math.floor((now - firstSeen) / 60_000),
    }
  })
  const previous = await read($, agents)
  if (JSON.stringify(previous) !== JSON.stringify(views)) {
    await update($, agents, () => views)
  }
}

async function storedHistory($: EngineInterface, kind: string): Promise<UsageHistory | null> {
  const cached = usageHistories.get(kind)
  if (cached !== undefined) {
    return cached
  }
  const stored = await $.store.get(`usage:${kind}`)

  return isUsageHistory(stored) ? stored : null
}

async function refreshLimits($: EngineInterface, now: number): Promise<void> {
  const usage = await $.session.usage()
  const windows: LimitWindow[] = []
  for (const reading of usage.rateLimits) {
    const resetsAt = reading.resetsAt === undefined ? Number.NaN : Date.parse(reading.resetsAt)
    if (Number.isNaN(resetsAt) || windowLength(reading.kind) === null) {
      continue
    }
    const previous = await storedHistory($, reading.kind)
    const history = addSample(previous, reading.kind, resetsAt, { at: now, percent: reading.percentUsed })
    usageHistories.set(reading.kind, history)
    if (history !== previous) {
      await $.store.set(`usage:${reading.kind}`, history)
    }
    const window = limitWindowOf(history, reading.percentUsed, now)
    if (window !== null) {
      windows.push(window)
    }
  }
  windows.sort((a, b) => WINDOW_ORDER.indexOf(a.kind) - WINDOW_ORDER.indexOf(b.kind))

  const previous = await read($, limits)
  const hasChanged = JSON.stringify(previous?.windows ?? []) !== JSON.stringify(windows)
  if (hasChanged || now - lastLimitsDrawAt >= LIMITS_REDRAW_MS) {
    lastLimitsDrawAt = now
    await update($, limits, () => ({ computedAt: now, windows }))
  }
}

async function resumeRun($: EngineInterface): Promise<void> {
  await update($, pause, () => null)
  await $.prompt.submit({ text: RESUME_PROMPT })
}

function isSettling(now: number): boolean {
  return now - lastActiveAt < STOP_GRACE_MS
}

async function refreshPause($: EngineInterface, now: number): Promise<void> {
  if ((await read($, tracking)) === null) {
    return
  }
  const current = await read($, limits)
  const reached = current?.windows.find(window => window.pace === 'paused' && window.resetsAt > now)
  const existing = await read($, pause)
  if (reached !== undefined && existing === null) {
    const hasOpenRun = ((await read($, ledger))?.run ?? null) !== null
    const isRunOpen = hasOpenRun || now - lastActiveAt <= RECENTLY_ACTIVE_MS
    await update($, pause, () => ({ resetsAt: reached.resetsAt, isRunOpen }))
    return
  }
  if (existing === null || now < existing.resetsAt + RESUME_GRACE_MS) {
    return
  }
  if (existing.isRunOpen && (await read($, isAutoResumeOn))) {
    await resumeRun($)
    $.ui.toast('Plan band: the usage limit reset, so the plan run was asked to continue.')
    return
  }
  await update($, pause, () => null)
}

async function refreshAlerts($: EngineInterface, now: number): Promise<void> {
  if ((await read($, tracking)) === null) {
    return
  }
  const context = {
    status: await read($, status),
    ledger: await read($, ledger),
    limits: await read($, limits),
    isAutoResumeOn: await read($, isAutoResumeOn),
  }
  const snapshot = {
    chip: chipKindOf({
      ...context,
      agents: await read($, agents),
      isWorking: await read($, isTurnRunning),
      isSettling: isSettling(now),
    }),
    doneParts: donePartsOf(await read($, phase)),
    shippedPhases: context.ledger?.shippedPhases ?? [],
    pace: context.limits === null ? null : paceOfLimits(context.limits),
  }
  const previous = await read($, alertSnapshot)
  if (JSON.stringify(previous) === JSON.stringify(snapshot)) {
    return
  }
  await update($, alertSnapshot, () => snapshot)
  for (const alert of alertsBetween(previous, snapshot, context)) {
    await $.ui.notify(alert.text, { title: alert.title })
  }
}

async function refresh($: EngineInterface): Promise<void> {
  const now = await $.clock.now()
  await refreshAgents($, now)
  await refreshLimits($, now)
  await refreshPause($, now)
  await refreshFiles($)
  await refreshAlerts($, now)
}

async function openPane($: EngineInterface): Promise<boolean> {
  const { isPlaced } = await $.ui.open({ id: PANE_ID, title: 'Plan', columns: PANE_COLUMNS })

  return isPlaced
}

async function describeTracking($: EngineInterface): Promise<string> {
  const current: Tracking | null = await read($, tracking)
  if (current === null) {
    return 'No plan tracked yet. It starts when a plan skill runs plan_check.py status, or with /plan-band use <plan dir>.'
  }

  return `Tracking ${current.dir}, from ${REASON_TEXT[current.reason]}.`
}

async function useCommand($: EngineInterface, path: string): Promise<string> {
  const dir = await planDirOfPath($, path)
  if (dir === null) {
    return `${path} holds no plan.md or phase-*.md file.`
  }
  await track($, dir, 'use')

  return describeTracking($)
}

async function runCommand($: EngineInterface, args: string): Promise<string> {
  const words = args.trim().split(/\s+/).filter(word => word.length > 0)
  const [verb, ...rest] = words
  if (verb === undefined) {
    return describeTracking($)
  }
  if (verb === 'use' && rest.length > 0) {
    return useCommand($, rest.join(' '))
  }
  if (verb === 'hide' || verb === 'show') {
    await update($, isHidden, () => verb === 'hide')

    return verb === 'hide' ? 'Plan band hidden to one line.' : 'Plan band shown.'
  }
  if (verb === 'pane') {
    return (await openPane($)) ? 'Plan pane opened.' : 'Plan pane opens once the terminal has room for it.'
  }
  if (verb === 'resume') {
    await resumeRun($)

    return 'Asked the plan run to continue.'
  }
  if (verb === 'auto-resume' && (rest[0] === 'on' || rest[0] === 'off')) {
    await update($, isAutoResumeOn, () => rest[0] === 'on')

    return `Auto-resume after a usage limit is ${rest[0]}.`
  }

  return USAGE
}

async function readInput($: EngineInterface, isWorking: boolean, columns: number, rows: number): Promise<BandInput | null> {
  const current = await read($, tracking)
  if (current === null) {
    return null
  }

  return {
    tracking: current,
    status: await read($, status),
    phase: await read($, phase),
    ledger: await read($, ledger),
    agents: await read($, agents),
    limits: await read($, limits),
    pause: await read($, pause),
    isAutoResumeOn: await read($, isAutoResumeOn),
    isWorking: isWorking || (await read($, isTurnRunning)),
    isSettling: isSettling(await $.clock.now()),
    columns,
    rows,
  }
}

function actionsFor($: EngineInterface): BandActions {
  return {
    onHide: () => update($, isHidden, () => true),
    onShow: () => update($, isHidden, () => false),
    onPane: () => {
      void openPane($)
    },
    onResume: () => {
      void resumeRun($)
    },
    onToggleAutoResume: () => update($, isAutoResumeOn, isOn => !isOn),
  }
}

export const register: Register = (on, options) => {
  const shouldOpenPaneAtStart = options.openPaneAtStart !== false

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'plan-band',
      description: 'Show the plan band pane, pick the plan it tracks, or resume after a usage limit',
      argumentHint: '[use <plan dir> | pane | hide | show | resume | auto-resume on|off]',
    })
    ensureTicking($)
    const started = await next(e)
    if (shouldOpenPaneAtStart && e.isInteractive && !(await read($, hasOpenedPaneAtStart))) {
      await update($, hasOpenedPaneAtStart, () => true)
      await openPane($)
    }

    return started
  })

  on('command.run', { command: 'plan-band' }, async ($, e) => ({ text: await runCommand($, e.args) }))

  on('turn.start', async ($, e, next) => {
    lastActiveAt = await $.clock.now()
    await update($, isTurnRunning, () => true)

    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      lastActiveAt = await $.clock.now()
      await update($, isTurnRunning, () => false)
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    const found = findPlanDirInCommand(e.command)
    if (found === null || ran.deny !== undefined || ran.isError === true) {
      return ran
    }
    const planStatus = parseStatus(ran.result.stdout)
    const dir = await firstExistingDir($, await candidateDirs($, found.dir, found.cdDir))
    if (planStatus === null || dir === null) {
      return ran
    }
    await track($, dir, 'status', planStatus)

    return ran
  }).catch(($, e, next) => next(e))

  on('prompt.submit', async ($, e, next) => {
    const entered = await next(e)
    for (const path of mentionedPaths(e.text)) {
      const dir = await planDirOfPath($, path)
      if (dir !== null) {
        await track($, dir, 'mention')
        break
      }
    }

    return entered
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.surface !== 'terminal' || e.props.hasSurvey) {
      return next(e)
    }
    const input = await readInput($, e.props.isWorking, e.props.bodyColumns, e.props.maxRows)
    if (input === null) {
      return next(e)
    }
    const ui = $.ui.resolve(e)
    const actions = actionsFor($)
    const band = (await read($, isHidden)) ? drawHiddenLine(ui, input, actions) : drawBand(ui, input, actions)
    const below = await next(e)

    return (
      <ui.Box flexDirection="column">
        {band}
        {below}
      </ui.Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE_ID }, async ($, e, next) => {
    if (e.surface !== 'terminal') {
      return next(e)
    }
    const ui = $.ui.resolve(e)
    const input = await readInput($, false, e.props.bodyColumns, 0)
    if (input === null) {
      return <ui.Text dimColor>{await describeTracking($)}</ui.Text>
    }

    return drawPane(ui, input)
  })
}
