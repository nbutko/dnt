import { describe, expect, it } from 'vitest'
import abilitiesConfig from './abilities'

describe('abilitiesConfig', () => {
  it('sets a positive damageScale', () => {
    expect(abilitiesConfig.damageScale).toBeGreaterThan(0)
  })

  it('gives every dungeon tier a mimic deception DC', () => {
    // 11 dungeon tiers today (config/dungeon-tiers.ts) — keep in sync.
    expect(abilitiesConfig.mimicDeceptionDcByTier.length).toBeGreaterThanOrEqual(11)
  })

  it('never decreases the mimic DC by tier', () => {
    const dcs = abilitiesConfig.mimicDeceptionDcByTier
    for (let i = 1; i < dcs.length; i += 1) {
      expect(dcs[i]).toBeGreaterThanOrEqual(dcs[i - 1])
    }
  })

  it('sets a sane base INT tier cap', () => {
    expect(abilitiesConfig.baseIntTierCap).toBeGreaterThanOrEqual(1)
  })
})
