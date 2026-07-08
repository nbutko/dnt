import { describe, expect, it } from 'vitest'
import textBank from './text-banks'
import type { Rng, TextTier } from '../domain/types'

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

// Dungeon N ships text tiers [N, N+3] (content/text/library.json via
// content-pipeline/ship.ts).
const DUNGEONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
const tiersFor = (dungeon: number): TextTier[] =>
  [dungeon, dungeon + 1, dungeon + 2, dungeon + 3] as TextTier[]
// Every (dungeon, tier) cell the corpus ships, flattened for Promise.all.
const ALL_CELLS = DUNGEONS.flatMap((dungeon) => tiersFor(dungeon).map((tier) => ({ dungeon, tier })))

describe('text-banks', () => {
  it('loads every dungeon×tier cell it ships as a non-empty line list', async () => {
    const pools = await Promise.all(ALL_CELLS.map((c) => textBank.loadPool(c.dungeon, c.tier)))
    pools.forEach((lines, i) => {
      const { dungeon, tier } = ALL_CELLS[i]
      expect(lines.length, `D${dungeon} T${tier}`).toBeGreaterThan(0)
    })
  })

  it('serves each dungeon its own themed tier, not another dungeon’s', async () => {
    // Swamp (D6) T6 and Forest's shared tier are different prose, not a shared
    // flat pool — the whole point of per-dungeon content.
    const swampT6 = await textBank.loadPool(6, 6)
    const mountainT7 = await textBank.loadPool(7, 7)
    expect(swampT6).not.toEqual(mountainT7)
  })

  it('falls back to the same tier from another dungeon when this one lacks it', async () => {
    // Urban (D11) ships no tier 1; grassland (D1) is the only dungeon that
    // does, so a D11 T1 request resolves to grassland's tier-1 content.
    const urbanT1 = await textBank.loadPool(11, 1)
    const grasslandT1 = await textBank.loadPool(1, 1)
    expect(urbanT1.length).toBeGreaterThan(0)
    expect(urbanT1).toEqual(grasslandT1)
  })

  it('degrades to the nearest easier tier past the top of the ladder', async () => {
    // No valid TextTier is unshipped, so force a gap above T14: it degrades to
    // T14 rather than throwing (the old loader's safety net, now downward).
    const top = await textBank.loadPool(11, 14)
    const past = await textBank.loadPool(11, 99 as TextTier)
    expect(past).toEqual(top)
  })

  it('makePromptSource returns a picker that always returns a line from the pool', async () => {
    const rng = fakeRng([0, 0.25, 0.5, 0.75, 0.999])
    const source = await textBank.makePromptSource(6, 6, rng)
    const lines = await textBank.loadPool(6, 6)
    for (let i = 0; i < 5; i += 1) {
      expect(lines).toContain(source())
    }
  })

  it('every shipped dungeon×tier cell has ≥2 lines so no-repeat has an alternative (feedback #9)', async () => {
    const pools = await Promise.all(ALL_CELLS.map((c) => textBank.loadPool(c.dungeon, c.tier)))
    pools.forEach((lines, i) => {
      const { dungeon, tier } = ALL_CELLS[i]
      expect(lines.length, `D${dungeon} T${tier}`).toBeGreaterThanOrEqual(2)
    })
  })

  it('never serves the same line twice in a row (feedback #9)', async () => {
    // An rng that keeps returning 0 would, under a with-replacement sampler,
    // hand back lines[0] forever; the picker must step off it instead.
    const stuckRng = fakeRng([0])
    const source = await textBank.makePromptSource(6, 6, stuckRng)
    let previous = source()
    for (let i = 0; i < 20; i += 1) {
      const next = source()
      expect(next).not.toEqual(previous)
      previous = next
    }
  })
})
