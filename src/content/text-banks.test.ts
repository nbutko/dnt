import { describe, expect, it } from 'vitest'
import textBank from './text-banks'
import type { Rng } from '../domain/types'

const fakeRng = (values: number[]): Rng => {
  let i = 0
  return {
    next: () => {
      const value = values[i % values.length]
      i += 1
      return value
    },
    sample: (mean) => mean,
  }
}

describe('text-banks', () => {
  it('loads tier 1 and tier 2 as non-empty line lists', async () => {
    const tier1 = await textBank.loadTier(1)
    const tier2 = await textBank.loadTier(2)
    expect(tier1.length).toBeGreaterThan(0)
    expect(tier2.length).toBeGreaterThan(0)
  })

  it('rejects an unbundled tier', async () => {
    await expect(textBank.loadTier(3)).rejects.toThrow()
  })

  it('makePromptSource returns a picker that always returns a line from the tier', async () => {
    const rng = fakeRng([0, 0.25, 0.5, 0.75, 0.999])
    const source = await textBank.makePromptSource(1, rng)
    const lines = await textBank.loadTier(1)
    for (let i = 0; i < 5; i += 1) {
      expect(lines).toContain(source())
    }
  })
})
