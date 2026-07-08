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
  // Re-enabled by Story 5 (content-plan-v2-tuning-implementation.html), which
  // re-expressed the flat [1.2, 26] band as separate regular/boss bands
  // matching the "few big prompts" boss design (content-plan-v2-tuning.html
  // §3) — see combat-invariants.ts's Check 1 comment for the new shape and
  // why it's split by role.
  it('keeps hits-to-kill in a healthy band for its role and every sampled fight winnable', () => {
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

  // Re-enabled by Story 5. Story 1's lengthFactor cap + re-authored HP fixed
  // the *winnability* of a fixed hero against a higher tier, but hitsToKill
  // itself turned out to be the wrong signal to assert monotonicity on here —
  // see combat-invariants.ts's Check 3 comment for why (a real, hero-
  // independent D6->D11 dip in boss.hp / lengthFactor(bossTextTier) that no
  // amount of hero-side tuning can close) and why winRate is the honest
  // replacement signal.
  it('never makes a higher dungeon tier easier for a fixed hero', () => {
    const violations = sweepTierMonotonicity()
    expect(violations).toEqual([])
  })
})
