import type {
  ActiveTask,
  DoneTask,
  Finding,
  LedgerView,
  PartOutline,
  PhaseOutline,
  PlanStatus,
  Round,
  RunRange,
  Verdict,
  Verification,
} from '../types'

type Entry = { heading: string; body: string }

type Step = 'write' | 'verify' | 'review' | 'decision'

const STATUS_CALL = /plan_check\.py\s+status\s+("[^"]+"|'[^']+'|[^\s;&|]+)/
const LEADING_CD = /^\s*cd\s+("[^"]+"|'[^']+'|[^\s;&|]+)\s*&&/
const MENTION = /(?:^|\s)@("[^"]+"|[^\s"]+)/g
const PHASE_FILE = /^phase-\d+[\w.-]*\.md$/
const REVIEW_KINDS = ['Task review', 'Spec review', 'Standards', 'Mechanical check', 'Tester', 'Design review']
const SUMMARY_LENGTH = 70
const RECENT_ENTRIES = 8

export function printable(text: string): string {
  return text.replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
}

function unquote(token: string): string {
  const isQuoted = token.length >= 2 && (token.startsWith('"') || token.startsWith("'"))
  return isQuoted ? token.slice(1, -1) : token
}

function withoutTrailingSlash(path: string): string {
  return path.length > 1 ? path.replace(/\/+$/, '') : path
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
}

export function findPlanDirInCommand(command: string): { dir: string; cdDir: string | null } | null {
  const status = STATUS_CALL.exec(command)?.[1]
  if (status === undefined) {
    return null
  }
  const cd = LEADING_CD.exec(command)?.[1]

  return {
    dir: withoutTrailingSlash(unquote(status)),
    cdDir: cd === undefined ? null : withoutTrailingSlash(unquote(cd)),
  }
}

export function mentionedPaths(prompt: string): string[] {
  return [...prompt.matchAll(MENTION)].flatMap(match =>
    match[1] === undefined ? [] : [withoutTrailingSlash(unquote(match[1]))],
  )
}

export function isPlanFileName(name: string): boolean {
  return name === 'plan.md' || PHASE_FILE.test(name)
}

export function phaseFileFor(phaseNumber: number, names: string[]): string | null {
  return names.find(name => name.startsWith(`phase-${phaseNumber}-`) && name.endsWith('.md')) ?? null
}

export function parseStatus(output: string): PlanStatus | null {
  const fields = new Map<string, string>()
  const attention: string[] = []
  let isInAttention = false

  for (const line of output.split('\n')) {
    if (isInAttention && line.startsWith('  - ')) {
      attention.push(line.slice(4).trim())
      continue
    }
    isInAttention = false
    const field = /^([a-z]+):\s*(.*)$/.exec(line)
    if (field?.[1] === undefined) {
      continue
    }
    if (field[1] === 'attention') {
      isInAttention = true
      continue
    }
    fields.set(field[1], (field[2] ?? '').trim())
  }

  const state = fields.get('state')
  if (state === undefined) {
    return null
  }
  const current = /^phase (\d+)\s+(\S+)/.exec(fields.get('current') ?? '')
  const batch = fields.get('batch') ?? ''

  return {
    phaseNumber: current?.[1] === undefined ? null : Number(current[1]),
    phaseFile: current?.[2] ?? null,
    state,
    branch: fields.get('branch') ?? null,
    part: fields.get('part') ?? null,
    batch: batch.split(/\s+/).filter(id => id.length > 0),
    attention,
  }
}

export function parsePhaseOutline(markdown: string): PhaseOutline | null {
  const lines = markdown.split('\n')
  const title = /^# Phase (\d+): (.+)$/.exec(lines[0] ?? '')
  if (title?.[1] === undefined || title[2] === undefined) {
    return null
  }

  const parts: PartOutline[] = []
  let isInTasks = false
  for (const line of lines) {
    if (line.startsWith('## ')) {
      isInTasks = line.trim() === '## Tasks'
      continue
    }
    if (!isInTasks) {
      continue
    }
    const part = /^### Part (\d+\.\d+): (.+)$/.exec(line)
    if (part?.[1] !== undefined && part[2] !== undefined) {
      parts.push({ id: part[1], title: printable(part[2].trim()), leaves: [] })
      continue
    }
    const leaf = /^\s+- \[([ x])\] (\d+\.\d+): (.+)$/.exec(line)
    if (leaf?.[2] === undefined || leaf[3] === undefined) {
      continue
    }
    if (parts.length === 0) {
      parts.push({ id: null, title: '', leaves: [] })
    }
    parts.at(-1)?.leaves.push({ id: leaf[2], title: printable(leaf[3].trim()), isDone: leaf[1] === 'x' })
  }

  return { number: Number(title[1]), name: printable(title[2].trim()), parts }
}

function splitEntries(ledger: string): Entry[] {
  const entries: Entry[] = []
  for (const line of ledger.split('\n')) {
    if (line.startsWith('## ')) {
      entries.push({ heading: line.slice(3).trim(), body: '' })
      continue
    }
    const last = entries.at(-1)
    if (last !== undefined) {
      last.body = last.body === '' ? line : `${last.body}\n${line}`
    }
  }

  return entries
}

export function latestStartedPhase(ledger: string): number | null {
  const started = splitEntries(ledger)
    .map(entry => /^Phase started - phase (\d+)\b/.exec(entry.heading)?.[1])
    .filter(number => number !== undefined)

  return started.length === 0 ? null : Number(started.at(-1))
}

function activeRun(entries: Entry[]): RunRange | null {
  let run: RunRange | null = null
  for (const entry of entries) {
    const mark = /^Run - phases (\d+)-(\d+) - (started|finished)/.exec(entry.heading)
    if (mark?.[1] === undefined || mark[2] === undefined) {
      continue
    }
    run = mark[3] === 'started' ? { from: Number(mark[1]), to: Number(mark[2]) } : null
  }

  return run
}

function entriesOfPhase(entries: Entry[], phaseNumber: number): Entry[] {
  const startedAt = entries.findLastIndex(entry =>
    new RegExp(`^Phase started - phase ${phaseNumber}\\b`).test(entry.heading),
  )

  return startedAt === -1 ? entries : entries.slice(startedAt)
}

function fixNumberOf(heading: string): number {
  const fix = /fix round (\d+)/.exec(heading)?.[1]

  return fix === undefined ? 0 : Number(fix)
}

function stepOf(heading: string, taskRef: string): Step | null {
  const ref = escapeRegExp(taskRef)
  if (new RegExp(`^${ref} writer report\\b`).test(heading)) {
    return 'write'
  }
  if (new RegExp(`^Verification - ${ref}(\\s|$)`).test(heading)) {
    return 'verify'
  }
  if (new RegExp(`^Decision - ${ref}(\\s|$)`).test(heading)) {
    return 'decision'
  }
  const isReview = REVIEW_KINDS.some(kind => new RegExp(`^${kind} - ${ref}(\\s|$)`).test(heading))

  return isReview ? 'review' : null
}

function scoreOf(body: string): number | null {
  const score = /Score: (\d+)/.exec(body)?.[1]

  return score === undefined ? null : Number(score)
}

type Decision = Verdict | 'BLOCKED'

function decisionOf(body: string): Decision | null {
  const decision = /Decision: (PASS|FIX|BLOCKED)\b/.exec(body)?.[1] ?? /\b(PASS|FIX|BLOCKED)\b/.exec(body)?.[1]

  return decision === 'PASS' || decision === 'FIX' || decision === 'BLOCKED' ? decision : null
}

function needsFixRound(round: Round): boolean {
  return round.verdict === 'FIX' || round.review === 'failed'
}

function emptyRound(fixNumber: number): Round {
  return { fixNumber, write: 'todo', verify: 'todo', review: 'todo', score: null, verdict: null }
}

function markEarlierStepsDone(round: Round): Round {
  const hasDecision = round.verdict !== null
  const hasReview = hasDecision || round.review !== 'todo'
  const hasVerify = hasReview || round.verify !== 'todo'

  return {
    ...round,
    review: hasDecision && round.review === 'todo' ? 'done' : round.review,
    verify: hasReview && round.verify === 'todo' ? 'done' : round.verify,
    write: hasVerify && round.write === 'todo' ? 'done' : round.write,
  }
}

export function roundsOf(entries: Entry[], taskRef: string): Round[] {
  const rounds = new Map<number, Round>()
  for (const entry of entries) {
    const step = stepOf(entry.heading, taskRef)
    if (step === null) {
      continue
    }
    const fixNumber = fixNumberOf(entry.heading)
    const round = rounds.get(fixNumber) ?? emptyRound(fixNumber)
    if (step === 'write') {
      round.write = 'done'
    } else if (step === 'verify') {
      round.verify = entry.body.trimStart().startsWith('FAIL') ? 'failed' : 'done'
    } else if (step === 'review') {
      round.review = 'done'
    } else {
      const decision = decisionOf(entry.body)
      round.score = scoreOf(entry.body)
      if (decision === 'BLOCKED') {
        round.review = 'failed'
      } else {
        round.verdict = decision
      }
    }
    rounds.set(fixNumber, round)
  }

  const ordered = [...rounds.values()].sort((a, b) => a.fixNumber - b.fixNumber).map(markEarlierStepsDone)
  const last = ordered.at(-1)
  if (last !== undefined && needsFixRound(last)) {
    ordered.push(emptyRound(last.fixNumber + 1))
  }

  return ordered
}

function doneTasks(entries: Entry[], phaseNumber: number): DoneTask[] {
  const done = new RegExp(`^${phaseNumber}/(\\d+\\.\\d+) - done - ([0-9a-f]{7,40})`)

  return entries.flatMap(entry => {
    const match = done.exec(entry.heading)
    if (match?.[1] === undefined || match[2] === undefined) {
      return []
    }
    const taskRef = `${phaseNumber}/${match[1]}`
    const fixRounds = Math.max(0, ...roundsOf(entries, taskRef).filter(round => round.verdict !== null).map(round => round.fixNumber))

    return [{ id: match[1], hash: match[2], score: scoreOf(entry.body), fixRounds }]
  })
}

function activeTask(entries: Entry[], phaseNumber: number, done: DoneTask[]): ActiveTask | null {
  const doneIds = new Set(done.map(task => task.id))
  const taskId = new RegExp(`\\b${phaseNumber}/(\\d+\\.\\d+)\\b`)
  for (const entry of [...entries].reverse()) {
    const id = taskId.exec(entry.heading)?.[1]
    if (id === undefined || doneIds.has(id)) {
      continue
    }

    const rounds = roundsOf(entries, `${phaseNumber}/${id}`)

    return { id, rounds: rounds.length === 0 ? [emptyRound(0)] : rounds }
  }

  return null
}

function latestVerification(entries: Entry[]): Verification | null {
  const entry = entries.findLast(one => one.heading.startsWith('Verification - '))
  if (entry === undefined) {
    return null
  }
  const counts = /(\d+) passed, (\d+) failed/.exec(entry.body)

  return {
    isPass: entry.body.trimStart().startsWith('PASS'),
    passed: counts?.[1] === undefined ? null : Number(counts[1]),
    failed: counts?.[2] === undefined ? null : Number(counts[2]),
  }
}

function summaryOf(text: string): string {
  const firstClause = text.split(/;| - /)[0]?.trim() ?? ''

  return firstClause.length > SUMMARY_LENGTH ? `${firstClause.slice(0, SUMMARY_LENGTH - 1)}…` : firstClause
}

function findingsOf(entries: Entry[]): Finding[] {
  return entries.flatMap(entry => {
    if (!entry.heading.startsWith('Found - ')) {
      return []
    }
    const rest = entry.heading.slice('Found - '.length)
    const split = rest.indexOf(' - ')
    if (split === -1) {
      return []
    }
    const kind = rest.slice(0, split)
    const text = rest.slice(split + 3)
    const isFollowUp = kind.includes('(update)')
    const isFixNote = /\bfixed (out of plan )?in [0-9a-f]{7}/.test(text)
    if (isFollowUp || isFixNote) {
      return []
    }

    return [{ kind: printable(kind.replace(/\s*\(.*\)$/, '')), summary: summaryOf(printable(text)) }]
  })
}

function shippedPhasesOf(entries: Entry[]): number[] {
  return entries.flatMap(entry => {
    const shipped = /^Shipped - phase (\d+)\b/.exec(entry.heading)?.[1]

    return shipped === undefined ? [] : [Number(shipped)]
  })
}

function recentHeadings(entries: Entry[]): string[] {
  return entries.slice(-RECENT_ENTRIES).reverse().map(entry => summaryOf(printable(entry.heading)))
}

export function parseLedger(ledger: string, phaseNumber: number | null): LedgerView {
  const entries = splitEntries(ledger)
  const run = activeRun(entries)
  const shippedPhases = shippedPhasesOf(entries)
  if (phaseNumber === null) {
    return { phaseNumber, run, done: [], active: null, verification: null, findings: [], shippedPhases, recent: recentHeadings(entries) }
  }
  const phaseEntries = entriesOfPhase(entries, phaseNumber)
  const done = doneTasks(phaseEntries, phaseNumber)

  return {
    phaseNumber,
    run,
    done,
    active: activeTask(phaseEntries, phaseNumber, done),
    verification: latestVerification(phaseEntries),
    findings: findingsOf(phaseEntries),
    shippedPhases,
    recent: recentHeadings(phaseEntries),
  }
}
