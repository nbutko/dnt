import { describe, expect, it } from 'vitest'
import type { CombatConfig, TextTier } from '../../domain/types'
import { computeDamage, lengthFactor, rollIsCrit, speedBonus, tierGatePenalty } from '../damage'
import { createRng } from '../rng'

const baseCombat: CombatConfig = {
  baseDamage: 10,
  referenceLength: 10,
  lengthFactorFloor: 0.25,
  playerBaselineWpm: 15,
  avgWordLength: 5,
  playerTimeLimitFloorMs: 3000,
  playerReadingBufferMs: 2000,
  playerMaxHp: 100,
  missPauseMs: 2000,
  criticalChance: 0,
  criticalDamageMultiplier: 2,
  typingVariance: 0.15,
}

describe('lengthFactor', () => {
  it.each([
    { charCount: 10, expected: 1 },
    { charCount: 5, expected: 0.5 },
    { charCount: 20, expected: 2 },
  ])('charCount $charCount -> $expected', ({ charCount, expected }) => {
    expect(lengthFactor(charCount, baseCombat)).toBeCloseTo(expected)
  })

  it('clamps a very short prompt to the floor instead of going to zero/negative', () => {
    expect(lengthFactor(1, baseCombat)).toBe(baseCombat.lengthFactorFloor)
    expect(lengthFactor(0, baseCombat)).toBe(baseCombat.lengthFactorFloor)
  })
})

describe('speedBonus', () => {
  it.each([
    { timeUsedMs: 0, timeLimitMs: 1000, expected: 2 },
    { timeUsedMs: 500, timeLimitMs: 1000, expected: 1.5 },
    { timeUsedMs: 1000, timeLimitMs: 1000, expected: 1 },
    { timeUsedMs: 1500, timeLimitMs: 1000, expected: 1 },
  ])('timeUsed $timeUsedMs / timeLimit $timeLimitMs -> $expected', ({
    timeUsedMs,
    timeLimitMs,
    expected,
  }) => {
    expect(speedBonus(timeUsedMs, timeLimitMs)).toBeCloseTo(expected)
  })
})

describe('rollIsCrit', () => {
  it('never crits when criticalChance is 0', () => {
    const rng = createRng(5)
    const combat = { ...baseCombat, criticalChance: 0 }
    for (let i = 0; i < 50; i += 1) {
      expect(rollIsCrit(combat, rng)).toBe(false)
    }
  })

  it('always crits when criticalChance is 1', () => {
    const rng = createRng(5)
    const combat = { ...baseCombat, criticalChance: 1 }
    expect(rollIsCrit(combat, rng)).toBe(true)
  })

  it('is deterministic under a fixed seed', () => {
    const combat = { ...baseCombat, criticalChance: 0.5 }
    const a = rollIsCrit(combat, createRng(123))
    const b = rollIsCrit(combat, createRng(123))
    expect(a).toEqual(b)
  })

  it('forceCrit always crits, even at criticalChance 0, without consuming an rng draw', () => {
    const rng = createRng(5)
    const combat = { ...baseCombat, criticalChance: 0 }
    expect(rollIsCrit(combat, rng, { forceCrit: true })).toBe(true)
  })

  it('noCrits never crits, even at criticalChance 1', () => {
    const rng = createRng(5)
    const combat = { ...baseCombat, criticalChance: 1 }
    expect(rollIsCrit(combat, rng, { noCrits: true })).toBe(false)
  })

  it('noCrits wins over forceCrit if somehow both are set', () => {
    const rng = createRng(5)
    const combat = { ...baseCombat, criticalChance: 1 }
    expect(rollIsCrit(combat, rng, { forceCrit: true, noCrits: true })).toBe(false)
  })
})

describe('computeDamage', () => {
  it('combines lengthFactor, speedBonus and power-up multiplicatively, on top of a rolled weapon die', () => {
    const rng = createRng(1)
    const result = computeDamage({
      charCount: 20,
      timeUsedMs: 0,
      timeLimitMs: 1000,
      combat: baseCombat,
      rng,
      weaponDie: 6,
      weaponAbilityMod: 2,
      damageScale: 1,
      powerUpMultiplier: 2,
    })
    // lengthFactor(20) = 2, speedBonus(0/1000) = 2, crit off (chance 0) -> one
    // d6 roll + mod 2, powerUp = 2.
    expect(result.diceRolled).toHaveLength(1)
    const [roll] = result.diceRolled
    expect(roll).toBeGreaterThanOrEqual(1)
    expect(roll).toBeLessThanOrEqual(6)
    expect(result.damage).toBeCloseTo((roll + 2) * 1 * 2 * 2 * 2)
    expect(result.isCrit).toBe(false)
  })

  it('defaults powerUpMultiplier to 1 and applies damageScale to (roll + mod)', () => {
    const rng = createRng(1)
    const result = computeDamage({
      charCount: 10,
      timeUsedMs: 1000,
      timeLimitMs: 1000,
      combat: baseCombat,
      rng,
      weaponDie: 8,
      weaponAbilityMod: 0,
      damageScale: 1.5,
    })
    const [roll] = result.diceRolled
    expect(result.damage).toBeCloseTo(roll * 1.5)
  })

  it('multiplies in tierGatePenalty when under-tiered', () => {
    const rng = createRng(1)
    const result = computeDamage({
      charCount: 10,
      timeUsedMs: 1000,
      timeLimitMs: 1000,
      combat: baseCombat,
      rng,
      weaponDie: 6,
      weaponAbilityMod: 0,
      damageScale: 1,
      tierGatePenalty: 0.25,
    })
    const [roll] = result.diceRolled
    expect(result.damage).toBeCloseTo(roll * 0.25)
  })

  it('a crit rolls the weapon die twice (default critCount) and sums both', () => {
    const rng = createRng(1)
    const combat = { ...baseCombat, criticalChance: 1 }
    const result = computeDamage({
      charCount: 10,
      timeUsedMs: 1000,
      timeLimitMs: 1000,
      combat,
      rng,
      weaponDie: 6,
      weaponAbilityMod: 0,
      damageScale: 1,
    })
    expect(result.isCrit).toBe(true)
    expect(result.diceRolled).toHaveLength(2)
    const total = result.diceRolled[0] + result.diceRolled[1]
    expect(result.damage).toBeCloseTo(total)
  })

  it("a crit rolls three dice for the Wizard's arcane crit (critCount 3)", () => {
    const rng = createRng(1)
    const combat = { ...baseCombat, criticalChance: 1 }
    const result = computeDamage({
      charCount: 10,
      timeUsedMs: 1000,
      timeLimitMs: 1000,
      combat,
      rng,
      weaponDie: 6,
      weaponAbilityMod: 0,
      damageScale: 1,
      critCount: 3,
    })
    expect(result.isCrit).toBe(true)
    expect(result.diceRolled).toHaveLength(3)
  })

  it('guaranteedFirstCrit (forceCrit) makes the swing crit even at criticalChance 0', () => {
    const rng = createRng(1)
    const result = computeDamage({
      charCount: 10,
      timeUsedMs: 1000,
      timeLimitMs: 1000,
      combat: baseCombat, // criticalChance: 0
      rng,
      weaponDie: 6,
      weaponAbilityMod: 0,
      damageScale: 1,
      forceCrit: true,
    })
    expect(result.isCrit).toBe(true)
    expect(result.diceRolled).toHaveLength(2)
  })

  it('a fumble fight (noCrits) never crits and caps damage via fumbleDamageMultiplier', () => {
    const rng = createRng(1)
    const combat = { ...baseCombat, criticalChance: 1 } // would always crit otherwise
    const result = computeDamage({
      charCount: 10,
      timeUsedMs: 1000,
      timeLimitMs: 1000,
      combat,
      rng,
      weaponDie: 6,
      weaponAbilityMod: 0,
      damageScale: 1,
      noCrits: true,
      fumbleDamageMultiplier: 0.75,
    })
    expect(result.isCrit).toBe(false)
    expect(result.diceRolled).toHaveLength(1)
    expect(result.damage).toBeCloseTo(result.diceRolled[0] * 0.75)
  })

  it('is deterministic: the same seed produces the same dice/damage sequence', () => {
    const combat = { ...baseCombat, criticalChance: 0.5 }
    const run = () => {
      const rng = createRng(42)
      return [1, 2, 3, 4, 5].map(() =>
        computeDamage({
          charCount: 10,
          timeUsedMs: 500,
          timeLimitMs: 1000,
          combat,
          rng,
          weaponDie: 8,
          weaponAbilityMod: 2,
          damageScale: 1.5,
        }),
      )
    }
    expect(run()).toEqual(run())
  })
})

describe('tierGatePenalty', () => {
  it.each([
    { servedTier: 8, monsterTextTier: 8, expected: 1 },
    { servedTier: 10, monsterTextTier: 8, expected: 1 },
    { servedTier: 6, monsterTextTier: 8, expected: 0.5625 },
    { servedTier: 4, monsterTextTier: 8, expected: 0.25 },
  ] satisfies { servedTier: TextTier; monsterTextTier: TextTier; expected: number }[])(
    'served $servedTier vs monster $monsterTextTier -> $expected',
    ({ servedTier, monsterTextTier, expected }) => {
      expect(tierGatePenalty(servedTier, monsterTextTier)).toBeCloseTo(expected)
    },
  )
})
