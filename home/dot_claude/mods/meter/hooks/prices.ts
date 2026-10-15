import type { ModelUsage } from 'claude-code'

import type { Family, TokenCounts } from '../types'

type Price = { input: number; output: number; cacheRead: number; cacheWrite: number }

const TOKENS_PER_PRICE_UNIT = 1_000_000

// US dollars per million tokens, list prices from the claude-api skill (2026-10-06). Cache writes use the 5-minute rate and Haiku 5.5 its rate for prompts up to 100K tokens.
const MODEL_PRICES: [string, Price][] = [
  ['claude-fable-5-1', { input: 10, output: 50, cacheRead: 0.25, cacheWrite: 12.5 }],
  ['claude-mythos-5-1', { input: 10, output: 50, cacheRead: 0.25, cacheWrite: 12.5 }],
  ['claude-fable-5', { input: 10, output: 50, cacheRead: 1, cacheWrite: 12.5 }],
  ['claude-mythos-5', { input: 10, output: 50, cacheRead: 1, cacheWrite: 12.5 }],
  ['claude-opus-5-5', { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 }],
  ['claude-opus-5', { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 }],
  ['claude-opus-4', { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 }],
  ['claude-sonnet-5', { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 }],
  ['claude-sonnet-4', { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 }],
  ['claude-haiku-5-5', { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 }],
  ['claude-haiku-4', { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 }],
]

const FAMILY_PRICES: Record<Family, Price> = {
  fable: { input: 10, output: 50, cacheRead: 0.25, cacheWrite: 12.5 },
  opus: { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  sonnet: { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  haiku: { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  other: { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
}

const FAMILY_MARKERS: [string, Family][] = [
  ['fable', 'fable'],
  ['mythos', 'fable'],
  ['opus', 'opus'],
  ['sonnet', 'sonnet'],
  ['haiku', 'haiku'],
]

export function familyOf(model: string): Family {
  const lower = model.toLowerCase()

  return FAMILY_MARKERS.find(([marker]) => lower.includes(marker))?.[1] ?? 'other'
}

function priceOf(model: string): Price {
  const lower = model.toLowerCase()

  return MODEL_PRICES.find(([id]) => lower.includes(id))?.[1] ?? FAMILY_PRICES[familyOf(model)]
}

export function countsOf(usage: ModelUsage): TokenCounts {
  return {
    input: usage.input_tokens,
    output: usage.output_tokens,
    cacheRead: usage.cache_read_input_tokens,
    cacheWrite: usage.cache_creation_input_tokens,
  }
}

export function addCounts(a: TokenCounts, b: TokenCounts): TokenCounts {
  return {
    input: a.input + b.input,
    output: a.output + b.output,
    cacheRead: a.cacheRead + b.cacheRead,
    cacheWrite: a.cacheWrite + b.cacheWrite,
  }
}

export const NO_TOKENS: TokenCounts = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }

export function inputTotal(tokens: TokenCounts): number {
  return tokens.input + tokens.cacheRead + tokens.cacheWrite
}

export function allTokens(tokens: TokenCounts): number {
  return inputTotal(tokens) + tokens.output
}

export function cacheHitPercent(tokens: TokenCounts): number | null {
  const total = inputTotal(tokens)

  return total === 0 ? null : (tokens.cacheRead / total) * 100
}

export function listCost(tokens: TokenCounts, model: string): number {
  const price = priceOf(model)
  const dollars =
    tokens.input * price.input +
    tokens.output * price.output +
    tokens.cacheRead * price.cacheRead +
    tokens.cacheWrite * price.cacheWrite

  return dollars / TOKENS_PER_PRICE_UNIT
}

export function allocated(listUsd: number, totalListUsd: number, sessionUsd: number | null): number {
  if (sessionUsd === null || totalListUsd === 0) {
    return listUsd
  }

  return (listUsd / totalListUsd) * sessionUsd
}
