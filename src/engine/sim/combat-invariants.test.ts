import { describe, expect, it } from 'vitest'
import {
  sweepAbilityMonotonicity,
  sweepHitsToKillBand,
  sweepLevelingMonotonicity,
  sweepTierMonotonicity,
  sweepWeaponDieMonotonicity,
} from './combat-invariants'

// The Story 13 floor, locked in as a fast, seeded sweep — mirrors dungeon-
// invariants.test.ts's habit of asserting a sweep function's violation list
// is empty. Fails loudly if a future config/abilities.ts or config/
// leveling.ts edit reopens a gap this story closed (see combat-invariants.ts
// and balance.test.ts's Story 13 report for what each check catches and why
// its band/milestones are shaped the way they are).
describe('combat invariant sweep', () => {
  it('keeps hits-to-kill in a healthy multi-prompt band and every sampled fight winnable', () => {
    const violations = sweepHitsToKillBand()
    expect(violations).toEqual([])
  })

  it('never makes leveling up strictly worse (damage, HP, or proficiency)', () => {
    const violations = sweepLevelingMonotonicity()
    expect(violations).toEqual([])
  })

  it('never makes a bigger weapon die strictly worse', () => {
    const violations = sweepWeaponDieMonotonicity()
    expect(violations).toEqual([])
  })

  it('never makes a higher ability score strictly worse', () => {
    const violations = sweepAbilityMonotonicity()
    expect(violations).toEqual([])
  })

  it('never makes a higher dungeon tier easier for a fixed hero', () => {
    const violations = sweepTierMonotonicity()
    expect(violations).toEqual([])
  })
})
