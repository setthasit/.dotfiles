import { describe, expect, test } from 'claude-code/testing'
import type { FsEntry } from 'claude-code'

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

    const band = await $.ui.mount(BAND)
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
