import { describe, expect, it } from 'vitest'
import type { Ability } from '../domain/character'
import { getWeapon, WEAPONS } from './weapons'

const ABILITIES: readonly Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

describe('WEAPONS', () => {
  it('governs every weapon by a real Ability', () => {
    for (const weapon of WEAPONS) {
      expect(ABILITIES).toContain(weapon.ability)
    }
  })

  it('prices every weapon positively', () => {
    for (const weapon of WEAPONS) {
      expect(weapon.price).toBeGreaterThan(0)
    }
  })

  it('sets a crit range between 17 and 20 (Story 3\'s "+N" weapons tighten it as low as 17)', () => {
    for (const weapon of WEAPONS) {
      expect(weapon.critRange).toBeGreaterThanOrEqual(17)
      expect(weapon.critRange).toBeLessThanOrEqual(20)
    }
  })

  it('never sets a negative bonusDamage', () => {
    for (const weapon of WEAPONS) {
      expect(weapon.bonusDamage).toBeGreaterThanOrEqual(0)
    }
  })

  it('only taxes the time budget for the greataxe', () => {
    for (const weapon of WEAPONS) {
      if (weapon.id === 'greataxe') {
        expect(weapon.timeBudgetPenaltyMs).toBeGreaterThan(0)
      } else {
        expect(weapon.timeBudgetPenaltyMs).toBe(0)
      }
    }
  })

  it('looks up a known weapon and throws for an unknown one', () => {
    expect(getWeapon('dagger').die).toBe(4)
    // @ts-expect-error deliberately invalid id
    expect(() => getWeapon('halberd')).toThrow()
  })
})
