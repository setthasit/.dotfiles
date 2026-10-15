import type { GuardName } from '../types'
import { clipped, firstLine, printable } from './text'

export type GuardBlock = { guard: GuardName; reason: string; detail: string }

export type SpawnRequest = { subagentType: string; model?: string; fork: boolean }

export const MAX_SUBJECT_CHARS = 50
export const AI_MARK = '[AI]'
const MAX_COMMAND_CHARS = 20_000
const MAX_ROLE_SHOWN = 40
const MAX_SUBJECT_SHOWN = 60
const MAX_COMMAND_SHOWN = 80
const GIT_OPTIONS_WITH_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path', '--config-env'])
const GIT_CONFIG_OPTIONS = new Set(['-c', '--config-env'])
const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash'])
const MAX_NESTED_SHELLS = 3
const NO_VERIFY_PREFIX = '--no-veri'
const FORCE_PREFIX = '--forc'
const HOOK_BYPASS_CONFIG = /^(core\.hookspath=|remote\..+\.push=\+|alias\..*(--forc|--no-veri| -[a-z]*[fn]| \+))/i
const GIT_CONFIG_ENV = /^GIT_CONFIG_(COUNT|KEY_|VALUE_|PARAMETERS)/
const CONFIG_ENV_PREFIX = '--config-env='
const GIT_WORD = /\bgit\b/
const GIT_WRITE_WORD = /\b(push|commit)\b/
const COMMAND_WRAPPERS = new Set(['sudo', 'env', 'command', 'exec', 'time', 'nohup'])
const ENV_ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/
const SHORT_CLUSTER = /^-[A-Za-z]+$/
const SHORT_OPTION = /^-[A-Za-z]/
const COMMIT_VALUE_FLAGS = new Set(['F', 'C', 'c', 't', 'm'])
const UNCHECKABLE_COMMIT_FLAGS = new Set(['F', 'C', 'c'])
const ATTACHED_VALUE_FLAGS = new Set(['u', 'S'])
const UNCHECKABLE_COMMIT_OPTIONS = ['--file', '--reuse-message', '--reedit-message', '--fixup', '--squash', '--template']
const HEREDOC_START = /^<<-?[ \t]*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/
const HEREDOC = /<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1[^\n]*\n([\s\S]*?)\n[ \t]*\2[ \t]*(?:\n|\)|$)/
const SEGMENT_BREAKS = new Set([';', '|', '&', '(', ')'])
const GROUP_BRACES = new Set(['{', '}'])

type Scan = { segments: string[][]; words: string[]; word: string; hasWord: boolean; heredocs: string[]; substitutions: string[] }

export type CommandParts = { segments: string[][]; substitutions: string[] }

function endWord(scan: Scan): void {
  if (scan.hasWord) {
    scan.words.push(scan.word)
  }
  scan.word = ''
  scan.hasWord = false
}

function endSegment(scan: Scan): void {
  endWord(scan)
  if (scan.words.length > 0) {
    scan.segments.push(scan.words)
  }
  scan.words = []
}

function terminatorLineEnd(command: string, newline: number, delimiter: string): number | null {
  let lineStart = newline + 1
  while (lineStart < command.length) {
    const next = command.indexOf('\n', lineStart)
    const lineEnd = next === -1 ? command.length : next
    if (command.slice(lineStart, lineEnd).trim() === delimiter) {
      return lineEnd
    }
    lineStart = lineEnd + 1
  }

  return null
}

function heredocBodyEnd(command: string, newline: number, delimiter: string): number {
  return terminatorLineEnd(command, newline, delimiter) ?? command.length
}

function heredocEnd(command: string, start: number): number {
  const delimiter = HEREDOC_START.exec(command.slice(start))?.[2]
  const newline = command.indexOf('\n', start)
  const end = delimiter === undefined || newline === -1 ? null : terminatorLineEnd(command, newline, delimiter)

  return end ?? start + 2
}

function substitutionEnd(command: string, start: number): number {
  let depth = 0
  let quote: string | null = null
  for (let i = start; i < command.length; i++) {
    const ch = command[i]
    if (quote !== null) {
      if (ch === quote) {
        quote = null
      }
      continue
    }
    if (ch === '<' && command[i + 1] === '<') {
      i = heredocEnd(command, i) - 1
      continue
    }
    if (ch === "'" || ch === '"') {
      quote = ch
    } else if (ch === '(') {
      depth += 1
    } else if (ch === ')') {
      depth -= 1
      if (depth === 0) {
        return i + 1
      }
    }
  }

  return command.length
}

function endLine(scan: Scan, command: string, newline: number): number {
  endSegment(scan)
  let end = newline
  for (const delimiter of scan.heredocs) {
    end = heredocBodyEnd(command, end, delimiter)
  }
  scan.heredocs = []

  return end
}

export function commandSegments(command: string): string[][] {
  return commandParts(command).segments
}

export function commandParts(command: string): CommandParts {
  const scan: Scan = { segments: [], words: [], word: '', hasWord: false, heredocs: [], substitutions: [] }
  let quote: string | null = null
  for (let i = 0; i < command.length; i++) {
    const ch = command[i] ?? ''
    if (quote === "'") {
      if (ch === "'") {
        quote = null
      } else {
        scan.word += ch
      }
      continue
    }
    if (ch === '\\' && i + 1 < command.length) {
      if (command[i + 1] !== '\n') {
        scan.word += command[i + 1]
        scan.hasWord = true
      }
      i += 1
      continue
    }
    if (ch === '$' && command[i + 1] === "'") {
      scan.hasWord = true
      continue
    }
    if (ch === '$' && command[i + 1] === '(') {
      const end = substitutionEnd(command, i + 1)
      scan.substitutions.push(command.slice(i + 2, end - 1))
      scan.word += command.slice(i, end)
      scan.hasWord = true
      i = end - 1
      continue
    }
    if (ch === '`') {
      const close = command.indexOf('`', i + 1)
      const end = close === -1 ? command.length : close
      scan.substitutions.push(command.slice(i + 1, end))
      scan.word += command.slice(i, end + 1)
      scan.hasWord = true
      i = end
      continue
    }
    if (quote === '"') {
      if (ch === '"') {
        quote = null
      } else {
        scan.word += ch
      }
      continue
    }
    const heredoc = ch === '<' ? HEREDOC_START.exec(command.slice(i)) : null
    if (heredoc !== null) {
      endWord(scan)
      scan.heredocs.push(heredoc[2] ?? '')
      i += heredoc[0].length - 1
    } else if (ch === '#' && !scan.hasWord) {
      const lineEnd = command.indexOf('\n', i)
      i = (lineEnd === -1 ? command.length : lineEnd) - 1
    } else if (ch === '"' || ch === "'") {
      quote = ch
      scan.hasWord = true
    } else if (ch === ' ' || ch === '\t') {
      endWord(scan)
    } else if (ch === '\n') {
      i = endLine(scan, command, i)
    } else if (SEGMENT_BREAKS.has(ch) || (GROUP_BRACES.has(ch) && !scan.hasWord)) {
      endSegment(scan)
    } else {
      scan.word += ch
      scan.hasWord = true
    }
  }
  endSegment(scan)

  return { segments: scan.segments, substitutions: scan.substitutions }
}

function isGitProgram(word: string): boolean {
  return word === 'git' || word.endsWith('/git')
}

export type GitCall = { sub: string; args: string[]; configs: string[]; hasConfigEnv: boolean }

function withoutWrappers(words: string[]): string[] {
  const rest = [...words]
  while (rest[0] !== undefined && (ENV_ASSIGNMENT.test(rest[0]) || COMMAND_WRAPPERS.has(rest[0]))) {
    rest.shift()
  }

  return rest
}

export function gitCall(words: string[]): GitCall | null {
  const rest = withoutWrappers(words)
  const hasConfigEnv = words.slice(0, words.length - rest.length).some(word => GIT_CONFIG_ENV.test(word))
  const program = rest.shift()
  if (program === undefined || !isGitProgram(program)) {
    return null
  }
  const configs: string[] = []
  for (let option = rest[0]; option !== undefined && option.startsWith('-'); option = rest[0]) {
    rest.shift()
    if (option.startsWith(CONFIG_ENV_PREFIX)) {
      configs.push(option.slice(CONFIG_ENV_PREFIX.length))
    }
    if (GIT_OPTIONS_WITH_VALUE.has(option)) {
      const value = rest.shift()
      if (value !== undefined && GIT_CONFIG_OPTIONS.has(option)) {
        configs.push(value)
      }
    }
  }
  const sub = rest.shift()

  return sub === undefined ? null : { sub, args: rest, configs, hasConfigEnv }
}

function nestedCommand(words: string[]): string | null {
  const [program, ...args] = withoutWrappers(words)
  if (program === 'eval') {
    return args.join(' ')
  }
  if (program === undefined || !SHELLS.has(program.slice(program.lastIndexOf('/') + 1))) {
    return null
  }
  const flagIndex = args.findIndex(arg => SHORT_CLUSTER.test(arg) && arg.includes('c'))

  return flagIndex === -1 ? null : (args[flagIndex + 1] ?? null)
}

type CommitArgs = { messages: string[]; isUncheckable: boolean; hasNoVerify: boolean }

function readCluster(cluster: string, nextArg: string | undefined, found: CommitArgs): boolean {
  const flags = cluster.slice(1)
  for (const [j, flag] of [...flags].entries()) {
    if (ATTACHED_VALUE_FLAGS.has(flag)) {
      return false
    }
    if (flag === 'n') {
      found.hasNoVerify = true
    }
    if (!COMMIT_VALUE_FLAGS.has(flag)) {
      continue
    }
    const rest = flags.slice(j + 1)
    const value = rest.length > 0 ? rest : nextArg
    if (flag === 'm' && value !== undefined) {
      found.messages.push(value)
    }
    if (UNCHECKABLE_COMMIT_FLAGS.has(flag)) {
      found.isUncheckable = true
    }

    return rest.length === 0
  }

  return false
}

function isUncheckableOption(arg: string): boolean {
  return UNCHECKABLE_COMMIT_OPTIONS.some(option => arg === option || arg.startsWith(`${option}=`))
}

export function commitArgs(args: string[]): CommitArgs {
  const found: CommitArgs = { messages: [], isUncheckable: false, hasNoVerify: false }
  const queue = [...args]
  for (let arg = queue.shift(); arg !== undefined && arg !== '--'; arg = queue.shift()) {
    if (arg.startsWith(NO_VERIFY_PREFIX)) {
      found.hasNoVerify = true
    } else if (arg === '--message') {
      const value = queue.shift()
      if (value !== undefined) {
        found.messages.push(value)
      }
    } else if (arg.startsWith('--message=')) {
      found.messages.push(arg.slice('--message='.length))
    } else if (isUncheckableOption(arg)) {
      found.isUncheckable = true
      if (!arg.includes('=')) {
        queue.shift()
      }
    } else if (SHORT_OPTION.test(arg) && readCluster(arg, queue[0], found)) {
      queue.shift()
    }
  }

  return found
}

export function subjectOf(message: string): string | null {
  if (message.startsWith('$(')) {
    const body = HEREDOC.exec(message)?.[3]

    return body === undefined ? null : firstLine(body)
  }
  if (message.includes('$') || message.includes('`')) {
    return null
  }

  return firstLine(message)
}

function subjectProblem(subject: string): string | null {
  const length = [...subject].length
  const hasMark = subject.includes(AI_MARK)
  if (hasMark && length <= MAX_SUBJECT_CHARS) {
    return null
  }
  const markNote = hasMark ? '' : `, no ${AI_MARK}`

  return `Got ${length} characters${markNote}.`
}

function isForcePush(args: string[]): boolean {
  return args.some(arg => arg.startsWith(FORCE_PREFIX) || (SHORT_CLUSTER.test(arg) && arg.includes('f')) || arg.startsWith('+'))
}

function bypassBlock(detail: string): GuardBlock {
  return {
    guard: 'no-bypass',
    reason: "Blocked by meter guard no-bypass. Skipping the repo's hooks and force push are off. Fix what the hook reports, or push a new commit instead.",
    detail: clipped(printable(detail), MAX_COMMAND_SHOWN),
  }
}

function commitBlock(args: string[]): GuardBlock | null {
  const found = commitArgs(args)
  if (found.hasNoVerify) {
    return bypassBlock('git commit without hooks')
  }
  const [firstMessage] = found.messages
  if (found.isUncheckable || firstMessage === undefined) {
    return null
  }
  const subject = subjectOf(firstMessage)
  const problem = subject === null ? null : subjectProblem(subject)
  if (subject === null || problem === null) {
    return null
  }

  return {
    guard: 'commit-message',
    reason: `Blocked by meter guard commit-message. The subject needs ${AI_MARK} and at most ${MAX_SUBJECT_CHARS} characters. ${problem}`,
    detail: `"${clipped(printable(subject), MAX_SUBJECT_SHOWN)}" ${problem}`,
  }
}

function configWrites(call: GitCall): string[] {
  if (call.sub !== 'config') {
    return []
  }
  const [key, ...values] = call.args.filter(arg => !arg.startsWith('-'))

  return key === undefined ? [] : [`${key}=${values.join(' ')}`]
}

function gitBlock(call: GitCall, words: string[]): GuardBlock | null {
  const isBypass =
    call.hasConfigEnv ||
    [...call.configs, ...configWrites(call)].some(config => HOOK_BYPASS_CONFIG.test(config)) ||
    call.args.some(arg => arg.startsWith(NO_VERIFY_PREFIX)) ||
    (call.sub === 'push' && isForcePush(call.args))
  if (isBypass) {
    return bypassBlock(words.join(' '))
  }

  return call.sub === 'commit' ? commitBlock(call.args) : null
}

function mentionsGitWrite(command: string): boolean {
  return GIT_WORD.test(command) && GIT_WRITE_WORD.test(command)
}

function oversizedBlock(command: string): GuardBlock | null {
  if (!mentionsGitWrite(command)) {
    return null
  }

  return {
    guard: 'no-bypass',
    reason: `Blocked by meter guard no-bypass. The command is over ${MAX_COMMAND_CHARS} characters and mentions a git write, too long to check. Write large files with the Write tool and run git as its own command.`,
    detail: `command over ${MAX_COMMAND_CHARS} characters`,
  }
}

function segmentsBlock(command: string, depth: number): GuardBlock | null {
  if (depth > MAX_NESTED_SHELLS) {
    return mentionsGitWrite(command) ? bypassBlock('git write nested too deep to check') : null
  }
  const parts = commandParts(command)
  const nested = parts.segments.flatMap(words => nestedCommand(words) ?? [])
  for (const inner of [...nested, ...parts.substitutions]) {
    const innerBlock = segmentsBlock(inner, depth + 1)
    if (innerBlock !== null) {
      return innerBlock
    }
  }
  for (const words of parts.segments) {
    const call = gitCall(words)
    const block = call === null ? null : gitBlock(call, words)
    if (block !== null) {
      return block
    }
  }

  return null
}

export function commandBlock(command: string): GuardBlock | null {
  return command.length > MAX_COMMAND_CHARS ? oversizedBlock(command) : segmentsBlock(command, 0)
}

export function spawnBlock(request: SpawnRequest): GuardBlock | null {
  if (request.model === undefined || request.fork) {
    return null
  }
  const role = clipped(printable(request.subagentType), MAX_ROLE_SHOWN)
  const model = clipped(printable(request.model), MAX_ROLE_SHOWN)

  return {
    guard: 'role-pin',
    reason: `Blocked by meter guard role-pin. The ${role} role sets its own model, so a spawn may not pass model (got "${model}"). Spawn it again without model.`,
    detail: `${role} with model "${model}"`,
  }
}

export function countByGuard(guards: GuardName[]): Map<GuardName, number> {
  const counts = new Map<GuardName, number>()
  for (const guard of guards) {
    counts.set(guard, (counts.get(guard) ?? 0) + 1)
  }

  return counts
}
