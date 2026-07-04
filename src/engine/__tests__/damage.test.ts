import { describe, expect, it } from 'vitest'
import type { CombatConfig } from '../../domain/types'
import { computeDamage, critMultiplier, lengthFactor, speedBonus } from '../damage'
import { createRng } from '../rng'

const baseCombat: CombatConfig = {
  baseDamage: 10,
  referenceLength: 10,
  lengthFactorFloor: 0.25,
  playerBaselineWpm: 15,
  avgWordLength: 5,
  playerTimeLimitFloorMs: 3000,
  playerMaxHp: 100,
  monsterSlack: 1.75,
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

describe('critMultiplier', () => {
  it('never crits when criticalChance is 0', () => {
    const rng = createRng(5)
    const combat = { ...baseCombat, criticalChance: 0 }
    for (let i = 0; i < 50; i += 1) {
      expect(critMultiplier(combat, rng).isCrit).toBe(false)
    }
  })

  it('always crits when criticalChance is 1, applying criticalDamageMultiplier', () => {
    const rng = createRng(5)
    const combat = { ...baseCombat, criticalChance: 1, criticalDamageMultiplier: 3 }
    const result = critMultiplier(combat, rng)
    expect(result.isCrit).toBe(true)
    expect(result.multiplier).toBe(3)
  })

  it('is deterministic under a fixed seed', () => {
    const combat = { ...baseCombat, criticalChance: 0.5 }
    const a = critMultiplier(combat, createRng(123))
    const b = critMultiplier(combat, createRng(123))
    expect(a).toEqual(b)
  })
})

describe('computeDamage', () => {
  it('combines lengthFactor, speedBonus, crit and power-up multiplicatively', () => {
    const rng = createRng(1)
    const result = computeDamage({
      charCount: 20,
      timeUsedMs: 0,
      timeLimitMs: 1000,
      combat: baseCombat,
      rng,
      powerUpMultiplier: 2,
    })
    // lengthFactor(20) = 2, speedBonus(0/1000) = 2, crit off (chance 0) = 1, powerUp = 2
    expect(result.damage).toBeCloseTo(10 * 2 * 2 * 1 * 2)
    expect(result.isCrit).toBe(false)
  })

  it('defaults powerUpMultiplier to 1', () => {
    const rng = createRng(1)
    const result = computeDamage({
      charCount: 10,
      timeUsedMs: 1000,
      timeLimitMs: 1000,
      combat: baseCombat,
      rng,
    })
    expect(result.damage).toBeCloseTo(10)
  })
})
