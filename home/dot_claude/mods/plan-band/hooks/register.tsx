import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { AgentView, PlanStatus, Tracking, TrackingReason } from '../types'
import { drawBand, drawHiddenLine } from './band'
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

const tracking = atom({ plugin: 'plan-band', key: 'tracking' } as const, null)
const status = atom({ plugin: 'plan-band', key: 'status' } as const, null)
const phase = atom({ plugin: 'plan-band', key: 'phase' } as const, null)
const ledger = atom({ plugin: 'plan-band', key: 'ledger' } as const, null)
const agents = atom({ plugin: 'plan-band', key: 'agents' } as const, [])
const isHidden = atom({ plugin: 'plan-band', key: 'isHidden' } as const, false)

const REFRESH_MS = 3000
const LEDGER_FILE = 'progress.md'
const ACTIVE_AGENT_STATUSES = new Set(['pending', 'running', 'waiting'])
const REASON_TEXT: Record<TrackingReason, string> = {
  status: 'a plan_check.py status call',
  mention: 'a plan named in your prompt',
  use: '/plan-band use',
}
const USAGE = 'Usage: /plan-band, /plan-band use <plan dir>, /plan-band hide, /plan-band show'

const seenFiles = new Map<string, number>()
const agentFirstSeen = new Map<string, number>()

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

async function isDirectory($: EngineInterface, path: string): Promise<boolean> {
  try {
    return (await $.fs.stat(path)).kind === 'dir'
  } catch {
    return false
  }
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

async function track($: EngineInterface, dir: string, reason: TrackingReason): Promise<void> {
  const current = await read($, tracking)
  if (current?.dir !== dir) {
    seenFiles.clear()
    await update($, status, () => null)
    await update($, phase, () => null)
    await update($, ledger, () => null)
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

async function phaseFileOf($: EngineInterface, dir: string, planStatus: PlanStatus | null, ledgerText: string | null) {
  if (planStatus?.phaseFile !== null && planStatus?.phaseFile !== undefined) {
    return `${dir}/${planStatus.phaseFile}`
  }
  const phaseNumber = ledgerText === null ? null : latestStartedPhase(ledgerText)
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
  const ledgerPath = `${current.dir}/${LEDGER_FILE}`
  const ledgerText = await changedText($, ledgerPath)
  const phasePath = await phaseFileOf($, current.dir, planStatus, ledgerText ?? (await $.fs.read(ledgerPath)))

  const phaseText = phasePath === null ? null : await changedText($, phasePath)
  if (phaseText !== null) {
    await update($, phase, () => parsePhaseOutline(phaseText))
  }
  if (ledgerText !== null || phaseText !== null) {
    const phaseNumber = planStatus?.phaseNumber ?? (await read($, phase))?.number ?? null
    const text = ledgerText ?? (await $.fs.read(ledgerPath))
    await update($, ledger, () => parseLedger(text, phaseNumber))
  }
}

async function refreshAgents($: EngineInterface): Promise<void> {
  const now = await $.clock.now()
  const active = (await $.agent.list()).filter(agent => ACTIVE_AGENT_STATUSES.has(agent.status))
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

async function refresh($: EngineInterface): Promise<void> {
  await refreshAgents($)
  await refreshFiles($)
}

async function describeTracking($: EngineInterface): Promise<string> {
  const current: Tracking | null = await read($, tracking)
  if (current === null) {
    return 'No plan tracked yet. It starts when a plan skill runs plan_check.py status, or with /plan-band use <plan dir>.'
  }

  return `Tracking ${current.dir}, from ${REASON_TEXT[current.reason]}.`
}

async function runCommand($: EngineInterface, args: string): Promise<string> {
  const [verb = '', ...rest] = args.trim().split(/\s+/)
  if (verb === '') {
    return describeTracking($)
  }
  if (verb === 'hide' || verb === 'show') {
    await update($, isHidden, () => verb === 'hide')

    return verb === 'hide' ? 'Plan band hidden to one line.' : 'Plan band shown.'
  }
  if (verb !== 'use' || rest.length === 0) {
    return USAGE
  }
  const dir = await planDirOfPath($, rest.join(' '))
  if (dir === null) {
    return `${rest.join(' ')} holds no plan.md or phase-*.md file.`
  }
  await track($, dir, 'use')

  return describeTracking($)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'plan-band',
      description: 'Show which plan the plan band tracks, or change it',
      argumentHint: '[use <plan dir> | hide | show]',
    })
    $.clock.every(REFRESH_MS, () => {
      // A plan file read mid-write can fail; the next tick reads it again.
      refresh($).catch(() => undefined)
    })

    return next(e)
  })

  on('command.run', { command: 'plan-band' }, async ($, e) => ({ text: await runCommand($, e.args) }))

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
    await update($, status, () => planStatus)
    await track($, dir, 'status')

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
    const current = await read($, tracking)
    if (current === null) {
      return next(e)
    }
    const input = {
      tracking: current,
      status: await read($, status),
      phase: await read($, phase),
      ledger: await read($, ledger),
      agents: await read($, agents),
      isWorking: e.props.isWorking,
      columns: e.props.bodyColumns,
    }
    const ui = $.ui.resolve(e)
    if (await read($, isHidden)) {
      return drawHiddenLine(ui, input, () => update($, isHidden, () => false))
    }

    return drawBand(ui, input, () => update($, isHidden, () => true))
  })
}
