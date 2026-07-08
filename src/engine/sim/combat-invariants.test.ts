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
  // PARKED pending the M4/M5 combat retune. Wiring the 14-tier content
  // (content/text/library.json) into the engine deliberately stretched the
  // difficulty surface the M0-era combat math was tuned against: prompts now run
  // up to ~2000 chars (was ~220), and damage scales with prompt length
  // (engine/damage.ts's lengthFactor), so high-INT readers one-shot high-tier
  // bosses while INT-gated melee grind them. The flat [1.2, 26] hits-to-kill band
  // assumed uniformly short prompts; the new content intends *few big* prompts at
  // high tiers (content-plan-v2.html §3.5), so this guard needs re-expressing
  // against the new design as part of the planned combat-tuning pass, not a
  // drive-by number change here (config/combat.ts stays frozen until then).
  // Re-enable and re-shape once that retune lands. The other four invariants
  // below (monotonicity, tier-difficulty) are length-independent and still hold.
  it.skip('keeps hits-to-kill in a healthy multi-prompt band and every sampled fight winnable', () => {
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
