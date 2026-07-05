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

const ALL_TIERS: TextTier[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

describe('text-banks', () => {
  it('loads every seeded tier 1-10 as a non-empty line list', async () => {
    const banks = await Promise.all(ALL_TIERS.map((tier) => textBank.loadTier(tier)))
    banks.forEach((lines, i) => {
      expect(lines.length, `tier ${ALL_TIERS[i]}`).toBeGreaterThan(0)
    })
  })

  it('serves each seeded tier its own distinct content, not a fallback', async () => {
    // Story 7 bundles all 10, so a mid-tier request no longer degrades — tier
    // 5 gets tier-5 lines, not tier 2's. (The fallback net below still guards
    // any gap opened by a future, not-yet-authored tier.)
    const tier2 = await textBank.loadTier(2)
    const tier5 = await textBank.loadTier(5)
    expect(tier5).not.toEqual(tier2)
  })

  it('falls back to the highest bundled tier at or below an unbundled request', async () => {
    // No valid TextTier is unbundled today, so force a gap: a tier past the
    // authored set degrades to tier 10 instead of throwing (finding A).
    const tier10 = await textBank.loadTier(10)
    const unbundled = await textBank.loadTier(99 as TextTier)
    expect(unbundled).toEqual(tier10)
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
