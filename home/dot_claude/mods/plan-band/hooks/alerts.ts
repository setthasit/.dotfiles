import type { AlertSnapshot, LedgerView, LimitsView, Pace, PhaseOutline, PlanStatus } from '../types'
import { clockTime, isWorsePace, windowName } from './usage'

export type Alert = { title: string; text: string }

const PACE_ALERTS: Partial<Record<Pace, string>> = { 'ease-off': 'Ease off', 'slow-down': 'Slow down' }

export function donePartsOf(phase: PhaseOutline | null): string[] {
  return (phase?.parts ?? [])
    .filter(part => part.leaves.length > 0 && part.leaves.every(leaf => leaf.isDone))
    .map(part => part.id)
}

function paceAlert(limits: LimitsView | null): Alert | null {
  const window = limits?.windows.find(one => PACE_ALERTS[one.pace] !== undefined)
  const title = window === undefined ? undefined : PACE_ALERTS[window.pace]
  if (window === undefined || title === undefined) {
    return null
  }
  const when = window.fullAt === null ? `${window.percent}% used` : `full by ~${clockTime(window.fullAt)} at this pace`

  return { title, text: `${windowName(window.kind)} limit ${when}.` }
}

function pauseText(limits: LimitsView | null, isAutoResumeOn: boolean): string {
  const window = limits?.windows.find(one => one.pace === 'paused')
  const reset = window === undefined ? 'when the limit resets' : `at ${clockTime(window.resetsAt)}`

  return isAutoResumeOn ? `Usage limit reached. Auto-resume ${reset}.` : `Usage limit reached. It resets ${reset}.`
}

export function alertsBetween(
  previous: AlertSnapshot | null,
  next: AlertSnapshot,
  context: { limits: LimitsView | null; status: PlanStatus | null; ledger: LedgerView | null; isAutoResumeOn: boolean },
): Alert[] {
  if (previous === null) {
    return []
  }
  const alerts: Alert[] = []

  for (const part of next.doneParts.filter(id => !previous.doneParts.includes(id))) {
    alerts.push({ title: `Part ${part} done`, text: 'Every task in the part is committed.' })
  }
  for (const phaseNumber of next.shippedPhases.filter(number => !previous.shippedPhases.includes(number))) {
    alerts.push({ title: `Phase ${phaseNumber} shipped`, text: 'The phase passed its ship review.' })
  }
  const isPaceWorse = next.pace !== null && isWorsePace(next.pace, previous.pace ?? 'on-pace')
  const pace = isPaceWorse && next.pace !== 'paused' ? paceAlert(context.limits) : null
  if (pace !== null) {
    alerts.push(pace)
  }
  if (next.chip !== previous.chip) {
    if (next.chip === 'paused') {
      alerts.push({ title: 'Plan paused', text: pauseText(context.limits, context.isAutoResumeOn) })
    } else if (next.chip === 'waiting') {
      alerts.push({ title: 'Waiting on you', text: `The plan asks for an answer (${context.status?.state ?? 'state unknown'}).` })
    } else if (next.chip === 'stopped') {
      alerts.push({ title: 'Plan stopped', text: 'The run is still open, and nothing is running.' })
    }
  }

  return alerts
}
