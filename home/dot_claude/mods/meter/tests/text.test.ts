import { describe, expect, test } from 'claude-code/testing'

import { tokenCount } from '../hooks/text'

describe('token counts', () => {
  test('stay short from hundreds to billions', () => {
    expect(tokenCount(950)).toBe('950')
    expect(tokenCount(59_400)).toBe('59.4k')
    expect(tokenCount(131_000)).toBe('131k')
    expect(tokenCount(78_110_000)).toBe('78.11M')
    expect(tokenCount(1_102_600_000)).toBe('1.10B')
    expect(tokenCount(2_799_800_000)).toBe('2.80B')
  })
})
