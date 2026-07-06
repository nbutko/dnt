import { describe, expect, it } from 'vitest'
import { CLASSES, getClass } from './classes'
import { WEAPONS } from './weapons'

describe('CLASSES', () => {
  it('gives every class a starting weapon that exists in the weapon table', () => {
    for (const classDef of CLASSES) {
      const weapon = WEAPONS.find((candidate) => candidate.id === classDef.startingWeapon)
      expect(weapon, `${classDef.id}'s starting weapon ${classDef.startingWeapon}`).toBeDefined()
    }
  })

  it('gives every class two distinct favored abilities', () => {
    for (const classDef of CLASSES) {
      const [first, second] = classDef.favoredAbilities
      expect(first).not.toBe(second)
    }
  })

  it('has a well-formed feature descriptor per class', () => {
    for (const classDef of CLASSES) {
      switch (classDef.feature.kind) {
        case 'second-wind':
          expect(classDef.feature.hpThresholdPct).toBeGreaterThan(0)
          expect(classDef.feature.healPct).toBeGreaterThan(0)
          break
        case 'arcane-mind':
          expect(classDef.feature.critDiceCount).toBeGreaterThan(2)
          expect(classDef.feature.intTierCapBonus).toBeGreaterThan(0)
          break
        case 'cunning':
          expect(classDef.feature.sneakAttackDice).toBeGreaterThan(0)
          expect(classDef.feature.sneakAttackDie).toBeGreaterThan(0)
          break
        case 'silver-tongue':
          expect(classDef.feature.shopDiscountPct).toBeGreaterThan(0)
          expect(classDef.feature.rerollsPerDungeon).toBeGreaterThan(0)
          break
        default:
          break
      }
    }
  })

  it('throws for an unknown class id', () => {
    // @ts-expect-error deliberately invalid id
    expect(() => getClass('paladin')).toThrow()
  })
})
