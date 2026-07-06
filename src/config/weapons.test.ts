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

  it('sets a crit range of 19 or 20', () => {
    for (const weapon of WEAPONS) {
      expect([19, 20]).toContain(weapon.critRange)
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
