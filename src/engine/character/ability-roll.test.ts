import { describe, expect, it } from 'vitest'
import { createRng } from '../rng'
import { ABILITY_ORDER, abilityRollsToScores, rollAbility, rollAbilityScores } from './ability-roll'

describe('rollAbility', () => {
  it('always lands the total in [3, 18] across many seeds', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const { total } = rollAbility(createRng(seed))
      expect(total).toBeGreaterThanOrEqual(3)
      expect(total).toBeLessThanOrEqual(18)
    }
  })

  it('drops the lowest of the 4 dice from the total', () => {
    for (let seed = 0; seed < 50; seed += 1) {
      const { dice, droppedIndex, total } = rollAbility(createRng(seed))
      const min = Math.min(...dice)
      expect(dice[droppedIndex]).toBe(min)
      const expectedTotal = dice.reduce((sum, value, index) => (index === droppedIndex ? sum : sum + value), 0)
      expect(total).toBe(expectedTotal)
    }
  })

  it('is deterministic for a given seed', () => {
    expect(rollAbility(createRng(42))).toEqual(rollAbility(createRng(42)))
  })
})

describe('rollAbilityScores / abilityRollsToScores', () => {
  it('produces one roll per ability, in the canonical order', () => {
    const rolls = rollAbilityScores(createRng(7))
    expect(Object.keys(rolls).sort()).toEqual([...ABILITY_ORDER].sort())
  })

  it('flattens to plain scores all within [3, 18]', () => {
    const scores = abilityRollsToScores(rollAbilityScores(createRng(7)))
    ABILITY_ORDER.forEach((ability) => {
      expect(scores[ability]).toBeGreaterThanOrEqual(3)
      expect(scores[ability]).toBeLessThanOrEqual(18)
    })
  })

  it('is deterministic for a given seed', () => {
    expect(abilityRollsToScores(rollAbilityScores(createRng(99)))).toEqual(
      abilityRollsToScores(rollAbilityScores(createRng(99))),
    )
  })
})
