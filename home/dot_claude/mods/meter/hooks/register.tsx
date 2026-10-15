import { atom, read, update } from 'claude-code'
import type { AgentSpawnInput, EngineInterface, PluginOptions, Register, Timer, ToolCallInput, TurnUsage } from 'claude-code'

import type { LiveAgent, PaneTab, SessionSpend, StoredHistory, TimelineEvent } from '../types'
import { drawLine, isEmptyTree } from './band'
import type { LineInput } from './band'
import type { GuardBlock } from './guards'
import { commandBlock, countByGuard, spawnBlock } from './guards'
import {
  EMPTY_HISTORY,
  daySpends,
  historyFrom,
  isForeignHistory,
  isHistoryRange,
  nextRange,
  rangeDays,
  rangeStats,
  roleSummaries,
  sessionsOn,
  storedRoles,
  sum,
  trials,
  upsertSession,
} from './history'
import type { ContextInput, HistoryInput, PaneActions, PaneInput } from './pane'
import { PANE_TABS, drawPane } from './pane'
import { allTokens, cacheHitPercent, countsOf, familyOf } from './prices'
import { MAIN_ROLE, addTurn, addTurnCache, nextSort, roleViews, spendPerHour, totalTokens, withoutAgent } from './tally'
import { addEvent, callCount, detailOf, isAgentTool, mcpServerOf, nextFilter, serverKey, toolKind, toolLabel } from './timeline'
import { clipped, dayKey, percent, printable, tokenCount, usd } from './text'

const roles = atom({ plugin: 'meter', key: 'roles' } as const, [])
const live = atom({ plugin: 'meter', key: 'live' } as const, [])
const agents = atom({ plugin: 'meter', key: 'agents' } as const, [])
const turns = atom({ plugin: 'meter', key: 'turns' } as const, [])
const timeline = atom({ plugin: 'meter', key: 'timeline' } as const, [])
const blocks = atom({ plugin: 'meter', key: 'blocks' } as const, [])
const turnBlocks = atom({ plugin: 'meter', key: 'turnBlocks' } as const, [])
const compactions = atom({ plugin: 'meter', key: 'compactions' } as const, 0)
const spend = atom({ plugin: 'meter', key: 'spend' } as const, { startedAt: 0, usd: null, segmentStartedAt: 0, segmentBaseUsd: 0 })
const mcpCalls = atom({ plugin: 'meter', key: 'mcpCalls' } as const, {})
const view = atom({ plugin: 'meter', key: 'view' } as const, { tab: 'costs', filter: 'all', sort: 'cost', range: '7d' })
const now = atom({ plugin: 'meter', key: 'now' } as const, 0)
const isBudgetPassed = atom({ plugin: 'meter', key: 'isBudgetPassed' } as const, false)
const hasOpenedPaneAtStart = atom({ plugin: 'meter', key: 'hasOpenedPaneAtStart' } as const, false)
// plan-band is not a dependency, so its contract is not typed here.
const PLAN_BAND_TRACKING = { plugin: 'plan-band', key: 'tracking' } as const

const PANE_ID = 'meter'
const PANE_COLUMNS = 84
const TICK_MS = 5000
const SAVE_EVERY_MS = 60_000
const HISTORY_KEY = 'history'
const MAX_BLOCKS = 50
const MAX_AGENTS = 200
const MAX_LABEL_CHARS = 40
const MAX_DESCRIPTION_CHARS = 60
const DEFAULT_PANE_ROWS = 40
const UNKNOWN_AGENT = 'agent'
const FORK_ROLE = 'fork'
const RESET_REASONS = new Set(['clear', 'resume'])
const COMMAND_GUARD_FAILED = 'meter: its command guard failed, so the command was stopped.'
const USAGE = 'Usage: /meter [costs | timeline | context | guards | history [today|7d|30d] | reset]'

let ticker: Timer | null = null
let lastSavedAt = 0
let cachedHistory: StoredHistory | null = null
let areGuardsOn = true
let budgetUsd = 0
let shouldOpenPaneAtStart = true

function readOptions(options: PluginOptions): void {
  areGuardsOn = options.guards !== false
  budgetUsd = typeof options.budgetUsd === 'number' && options.budgetUsd > 0 ? options.budgetUsd : 0
  shouldOpenPaneAtStart = options.openPaneAtStart !== false
}

function isPaneTab(word: string): word is PaneTab {
  return (PANE_TABS as string[]).includes(word)
}

function segmentUsd(spent: SessionSpend): number | null {
  if (spent.usd === null) {
    return null
  }
  if (spent.segmentBaseUsd === null) {
    return 0
  }

  return spent.usd < spent.segmentBaseUsd ? spent.usd : spent.usd - spent.segmentBaseUsd
}

async function agentOf($: EngineInterface, agentId: string | undefined): Promise<LiveAgent | null> {
  if (agentId === undefined) {
    return null
  }

  return (await read($, agents)).find(agent => agent.id === agentId) ?? null
}

async function agentName($: EngineInterface, agentId: string | undefined): Promise<string> {
  if (agentId === undefined) {
    return MAIN_ROLE
  }

  return (await agentOf($, agentId))?.role ?? UNKNOWN_AGENT
}

async function currentTime($: EngineInterface): Promise<number> {
  // Reading the ticker's value while drawing makes the engine redraw on each tick.
  await read($, now)

  return $.clock.now()
}

async function refreshSpend($: EngineInterface): Promise<void> {
  const usage = await $.session.usage()
  const spent = usage.cost?.usd ?? null
  await update($, spend, current => ({ ...current, startedAt: usage.startedAt, usd: spent }))
  if (budgetUsd === 0 || spent === null || spent < budgetUsd || (await read($, isBudgetPassed))) {
    return
  }
  await update($, isBudgetPassed, () => true)
  $.ui.toast(`meter · session spend passed the ${usd(budgetUsd)} budget (${usd(spent)}).`)
}

async function startSegment($: EngineInterface): Promise<void> {
  await refreshSpend($)
  const at = await $.clock.now()
  await update($, spend, current => ({ ...current, segmentStartedAt: at, segmentBaseUsd: current.usd ?? 0 }))
}

async function settleSegmentBase($: EngineInterface): Promise<void> {
  if ((await read($, spend)).segmentBaseUsd !== null) {
    return
  }
  await refreshSpend($)
  await update($, spend, current => ({ ...current, segmentBaseUsd: current.usd ?? 0 }))
}

async function refreshStatus($: EngineInterface): Promise<void> {
  const hit = cacheHitPercent(totalTokens(await read($, roles)))
  $.ui.status(hit === null ? undefined : `meter · cache ${percent(hit)}`)
}

async function pushEvent($: EngineInterface, event: TimelineEvent): Promise<void> {
  await update($, timeline, events => addEvent(events, event))
}

async function recordBlock($: EngineInterface, block: GuardBlock, agentId: string | undefined): Promise<void> {
  const at = await $.clock.now()
  const agent = await agentName($, agentId)
  await update($, blocks, list => [...list, { at, guard: block.guard, agent, detail: block.detail }].slice(-MAX_BLOCKS))
  await update($, turnBlocks, list => [...list, block.guard])
  await pushEvent($, {
    at,
    agent,
    family: null,
    kind: 'blocked',
    tool: block.guard === 'role-pin' ? 'Agent' : 'Bash',
    detail: block.detail,
    durationMs: null,
  })
}

async function commandGuard($: EngineInterface, command: string | undefined, agentId: string | undefined): Promise<GuardBlock | null> {
  const block = areGuardsOn && command !== undefined ? commandBlock(command) : null
  if (block !== null) {
    await recordBlock($, block, agentId)
  }

  return block
}

async function announceBlocks($: EngineInterface): Promise<void> {
  const blocked = await read($, turnBlocks)
  if (blocked.length === 0) {
    return
  }
  const parts = [...countByGuard(blocked).entries()].map(([guard, count]) => `${guard} ${count}`).join(' · ')
  $.ui.toast(`meter · ${blocked.length} call${blocked.length === 1 ? '' : 's'} blocked: ${parts}`)
  await update($, turnBlocks, () => [])
}

async function recordSpawn($: EngineInterface, e: AgentSpawnInput, model: string, agentId: string | undefined): Promise<void> {
  const at = await $.clock.now()
  const role = e.fork ? FORK_ROLE : clipped(printable(e.subagentType), MAX_LABEL_CHARS)
  const description = clipped(printable(e.description), MAX_DESCRIPTION_CHARS)
  const detail = `${role} · ${description}`
  const isRespawn = (await read($, timeline)).some(event => event.kind === 'spawn' && event.detail === detail)
  if (agentId !== undefined) {
    const agent: LiveAgent = { id: agentId, role, family: familyOf(model), description, startedAt: at, isRespawn }
    await update($, live, list => [...list, agent])
    await update($, agents, list => [...list, agent].slice(-MAX_AGENTS))
  }
  await pushEvent($, { at, agent: await agentName($, e.parentAgentId), family: null, kind: 'spawn', tool: 'Agent', detail, durationMs: null })
}

async function recordTool($: EngineInterface, e: ToolCallInput, startedAt: number, durationMs: number, isError: boolean): Promise<void> {
  const tool = String(e.tool)
  const server = mcpServerOf(tool)
  if (server !== null) {
    await update($, mcpCalls, calls => ({ ...calls, [serverKey(server)]: callCount(calls, server) + 1 }))
  }
  const agent = await agentOf($, e.agentId)
  await pushEvent($, {
    at: startedAt,
    agent: e.agentId === undefined ? MAIN_ROLE : (agent?.role ?? UNKNOWN_AGENT),
    family: agent?.family ?? null,
    kind: toolKind(durationMs, isError),
    tool: clipped(printable(toolLabel(tool)), MAX_LABEL_CHARS),
    detail: detailOf(e as unknown as Readonly<Record<string, unknown>>),
    durationMs,
  })
}

async function loadHistory($: EngineInterface): Promise<StoredHistory> {
  if (cachedHistory !== null) {
    return cachedHistory
  }
  cachedHistory = historyFrom(await $.store.get(HISTORY_KEY))

  return cachedHistory
}

async function saveSession($: EngineInterface): Promise<void> {
  const tallies = await read($, roles)
  if (tallies.length === 0) {
    return
  }
  await refreshSpend($)
  const at = await $.clock.now()
  const spent = await read($, spend)
  const views = roleViews(tallies, segmentUsd(spent))
  const startedAt = spent.segmentStartedAt > 0 ? spent.segmentStartedAt : at
  const session = {
    id: `${await $.session.id()}@${startedAt}`,
    day: dayKey(startedAt),
    startedAt,
    usd: segmentUsd(spent) ?? sum(views.map(one => one.usd)),
    blocks: (await read($, blocks)).length,
    roles: storedRoles(views),
  }
  const stored = await $.store.get(HISTORY_KEY)
  if (isForeignHistory(stored)) {
    return
  }
  const saved = upsertSession(historyFrom(stored), session, at)
  await $.store.set(HISTORY_KEY, saved)
  cachedHistory = saved
  lastSavedAt = at
}

async function resetSession($: EngineInterface): Promise<void> {
  await update($, roles, () => [])
  await update($, live, () => [])
  await update($, agents, () => [])
  await update($, turns, () => [])
  await update($, timeline, () => [])
  await update($, blocks, () => [])
  await update($, turnBlocks, () => [])
  await update($, compactions, () => 0)
  await update($, mcpCalls, () => ({}))
  await update($, isBudgetPassed, () => false)
  lastSavedAt = 0
  const at = await $.clock.now()
  await update($, spend, current => ({ ...current, segmentStartedAt: at, segmentBaseUsd: null }))
}

async function recordTurn($: EngineInterface, agentId: string | undefined, durationMs: number, usage: TurnUsage | undefined): Promise<void> {
  const agent = await agentOf($, agentId)
  if (usage !== undefined) {
    const tokens = countsOf(usage)
    await update($, roles, list =>
      addTurn(list, {
        role: agentId === undefined ? MAIN_ROLE : (agent?.role ?? UNKNOWN_AGENT),
        model: usage.model,
        family: familyOf(usage.model),
        tokens,
        durationMs,
        isRun: agentId !== undefined,
        isRespawn: agent?.isRespawn ?? false,
      }),
    )
    await update($, turns, list => addTurnCache(list, tokens))
  }
  if (agentId === undefined) {
    return
  }
  await update($, live, list => withoutAgent(list, agentId))
  await update($, agents, list => list.map(one => (one.id === agentId ? { ...one, isRespawn: false } : one)))
  const tokenText = usage === undefined ? '' : `${tokenCount(allTokens(countsOf(usage)))} tokens`
  await pushEvent($, {
    at: await $.clock.now(),
    agent: agent?.role ?? UNKNOWN_AGENT,
    family: agent?.family ?? (usage === undefined ? null : familyOf(usage.model)),
    kind: 'done',
    tool: 'Done',
    detail: [tokenText, agent?.description ?? ''].filter(part => part.length > 0).join(' · '),
    durationMs,
  })
}

async function afterMainTurn($: EngineInterface): Promise<void> {
  await refreshSpend($)
  await announceBlocks($)
  await refreshStatus($)
  if ((await $.clock.now()) - lastSavedAt >= SAVE_EVERY_MS) {
    await saveSession($)
  }
}

async function tick($: EngineInterface): Promise<void> {
  if ((await read($, live)).length === 0) {
    return
  }
  const at = await $.clock.now()
  await update($, now, () => at)
}

function ensureTicking($: EngineInterface): void {
  if (ticker !== null) {
    return
  }
  ticker = $.clock.every(TICK_MS, () => {
    tick($).catch(() => undefined)
  })
}

async function openPane($: EngineInterface, tab: PaneTab | null): Promise<string> {
  if (tab !== null) {
    await update($, view, current => ({ ...current, tab }))
  }
  const { isPlaced } = await $.ui.open({ id: PANE_ID, title: 'Meter', columns: PANE_COLUMNS, closeOnEscape: true })

  return isPlaced ? 'Meter pane opened.' : 'The meter pane opens once the terminal has room for it.'
}

async function resetCommand($: EngineInterface, isConfirmed: boolean): Promise<string> {
  const count = (await loadHistory($)).sessions.length
  if (!isConfirmed) {
    return `This deletes ${count} stored sessions. Run /meter reset confirm to delete them.`
  }
  await $.store.delete(HISTORY_KEY)
  cachedHistory = EMPTY_HISTORY

  return `Deleted ${count} stored sessions.`
}

async function runCommand($: EngineInterface, args: string): Promise<string> {
  const [verb, argument] = args.trim().split(/\s+/).filter(word => word.length > 0)
  if (verb === undefined) {
    return openPane($, null)
  }
  if (verb === 'reset') {
    return resetCommand($, argument === 'confirm')
  }
  if (verb === 'history' && argument !== undefined) {
    if (!isHistoryRange(argument)) {
      return USAGE
    }
    await update($, view, current => ({ ...current, range: argument }))
  }

  return isPaneTab(verb) ? openPane($, verb) : USAGE
}

async function isPlanBandShown($: EngineInterface): Promise<boolean> {
  const { value } = (await $.state.get(PLAN_BAND_TRACKING as never)) as { value?: unknown }

  return value !== undefined && value !== null
}

async function lineInput($: EngineInterface, isAgentListShown: boolean, columns: number): Promise<LineInput> {
  const spent = await read($, spend)
  const spentUsd = segmentUsd(spent)
  const at = await currentTime($)

  return {
    live: await read($, live),
    isAgentListShown,
    now: at,
    cachePercent: cacheHitPercent(totalTokens(await read($, roles))),
    sessionBlocks: (await read($, blocks)).length,
    turnBlocks: (await read($, turnBlocks)).length,
    spentUsd,
    perHour: spentUsd === null ? null : spendPerHour(spentUsd, spent.segmentStartedAt, at),
    budgetUsd,
    compactions: await read($, compactions),
    columns,
  }
}

async function hasLineData($: EngineInterface): Promise<boolean> {
  return (await read($, roles)).length > 0 || (await read($, live)).length > 0 || (await read($, blocks)).length > 0
}

async function contextInput($: EngineInterface, columns: number): Promise<ContextInput | null> {
  const breakdown = (await $.session.usage({ breakdown: 'summary', columns })).context.breakdown
  if (breakdown === undefined) {
    return null
  }
  const servers = new Map<string, number>()
  for (const tool of breakdown.mcpTools) {
    servers.set(tool.serverName, (servers.get(tool.serverName) ?? 0) + (tool.isLoaded ? tool.tokens : 0))
  }
  const calls = await read($, mcpCalls)

  return {
    usedTokens: breakdown.totalTokens,
    windowTokens: breakdown.maxTokens,
    categories: breakdown.categories
      .filter(category => category.kind === 'used')
      .map(category => ({ name: clipped(printable(category.name), MAX_LABEL_CHARS), tokens: category.tokens })),
    servers: [...servers.entries()].map(([name, loadedTokens]) => ({
      name: clipped(printable(name), MAX_LABEL_CHARS),
      loadedTokens,
      calls: callCount(calls, name),
    })),
  }
}

async function historyInput($: EngineInterface, at: number): Promise<HistoryInput> {
  const days = rangeDays((await read($, view)).range, at)
  const sessions = sessionsOn(await loadHistory($), days)

  return { days: daySpends(sessions, days), stats: rangeStats(sessions), roles: roleSummaries(sessions, days), trials: trials(sessions) }
}

async function paneInput($: EngineInterface, columns: number, rows: number): Promise<PaneInput> {
  const at = await currentTime($)
  const current = await read($, view)
  const spent = await read($, spend)
  const tallies = await read($, roles)
  const spentUsd = segmentUsd(spent)

  return {
    view: current,
    columns,
    rows,
    now: at,
    roles: roleViews(tallies, spentUsd),
    startedAt: spent.segmentStartedAt,
    spentUsd,
    perHour: spentUsd === null ? null : spendPerHour(spentUsd, spent.segmentStartedAt, at),
    cachePercent: cacheHitPercent(totalTokens(tallies)),
    live: await read($, live),
    turns: await read($, turns),
    timeline: await read($, timeline),
    blocks: await read($, blocks),
    compactions: await read($, compactions),
    areGuardsOn,
    context: current.tab === 'context' ? await contextInput($, columns) : null,
    history: current.tab === 'history' ? await historyInput($, at) : null,
  }
}

function paneActions($: EngineInterface): PaneActions {
  return {
    onTab: tab => update($, view, current => ({ ...current, tab })),
    onFilter: () => update($, view, current => ({ ...current, filter: nextFilter(current.filter) })),
    onSort: () => update($, view, current => ({ ...current, sort: nextSort(current.sort) })),
    onRange: () => update($, view, current => ({ ...current, range: nextRange(current.range) })),
  }
}

export const register: Register = (on, options) => {
  readOptions(options)

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'meter',
      description: 'Open the meter pane: cost per agent role, tool timing, context use, guard blocks and history',
      argumentHint: '[costs | timeline | context | guards | history [today|7d|30d] | reset]',
    })
    if ((await read($, spend)).segmentStartedAt === 0) {
      await startSegment($)
    } else {
      await refreshSpend($)
    }
    await refreshStatus($)
    ensureTicking($)
    const started = await next(e)
    if (shouldOpenPaneAtStart && e.isInteractive && !(await read($, hasOpenedPaneAtStart))) {
      await update($, hasOpenedPaneAtStart, () => true)
      await openPane($, null)
    }

    return started
  })

  on('turn.start', async ($, e, next) => {
    await settleSegmentBase($)

    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'meter' }, async ($, e) => ({ text: await runCommand($, e.args) }))

  on('agent.spawn', async ($, e, next) => {
    const block = areGuardsOn ? spawnBlock(e) : null
    if (block !== null) {
      await recordBlock($, block, e.parentAgentId)

      return { deny: block.reason }
    }
    const started = await next(e)
    if (started.deny === undefined) {
      await recordSpawn($, e, started.model, started.agentId)
    }

    return started
  }).catch(($, e, next) => (next.called ? next(e) : { deny: 'meter: its role-pin guard failed, so the spawn was stopped.' }))

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const block = await commandGuard($, e.command, e.agentId)

    return block === null ? next(e) : { deny: block.reason }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: COMMAND_GUARD_FAILED }))

  on('tool.call', { tool: 'Monitor' }, async ($, e, next) => {
    const block = await commandGuard($, e.command, e.agentId)

    return block === null ? next(e) : { deny: block.reason }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: COMMAND_GUARD_FAILED }))

  on('tool.call', async ($, e, next) => {
    if (isAgentTool(String(e.tool))) {
      return next(e)
    }
    const startedAt = await $.clock.now()
    const ran = await next(e)
    if (ran.deny !== undefined) {
      return ran
    }
    await recordTool($, e, startedAt, (await $.clock.now()) - startedAt, ran.isError === true)

    return ran
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    await recordTurn($, e.agentId, e.durationMs, e.usage)
    if (e.agentId === undefined) {
      await afterMainTurn($)
    }

    return done
  }).catch(($, e, next) => next(e))

  on('session.compact', async ($, e, next) => {
    const result = await next(e)
    if (result.skip !== undefined || e.agentId !== undefined || e.trigger === 'precompute') {
      return result
    }
    await update($, compactions, count => count + 1)
    const before = result.tokensBefore
    const after = result.tokensAfter
    const sizes = before !== undefined && after !== undefined ? ` ${tokenCount(before)} → ${tokenCount(after)} tokens.` : ''
    $.ui.toast(`meter · context compacted.${sizes} Session totals kept.`)

    return result
  }).catch(($, e, next) => next(e))

  on('session.end', async ($, e, next) => {
    await saveSession($)
    if (RESET_REASONS.has(e.reason)) {
      await resetSession($)
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    if (e.surface !== 'terminal' || e.props.hasSurvey || !(await hasLineData($))) {
      return below
    }
    const ui = $.ui.resolve(e)
    const isBelowEmpty = isEmptyTree(below)
    const isAgentListShown = isBelowEmpty && !(await isPlanBandShown($))
    const line = drawLine(ui, await lineInput($, isAgentListShown, e.props.bodyColumns), {
      onPane: () => {
        void openPane($, null)
      },
    })

    return isBelowEmpty ? line : (
      <ui.Box flexDirection="column">
        {below}
        {line}
      </ui.Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE_ID }, async ($, e, next) => {
    if (e.surface !== 'terminal') {
      return next(e)
    }
    const input = await paneInput($, e.props.bodyColumns, e.viewport?.rows ?? DEFAULT_PANE_ROWS)

    return drawPane($.ui.resolve(e), input, paneActions($))
  })
}
