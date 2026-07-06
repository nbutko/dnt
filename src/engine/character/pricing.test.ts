import { describe, expect, it } from 'vitest'
import type { Character } from '../../domain/character'
import { shopPrice } from './pricing'

const baseAbilities = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }

const fighter: Character = {
  name: 'Test Fighter',
  class: 'fighter',
  level: 1,
  xp: 0,
  abilities: baseAbilities,
  pendingAsi: 0,
}

describe('shopPrice — CHA 10 (mod 0), no class feature', () => {
  it('charges the base price with zero net discount', () => {
    expect(shopPrice(100, fighter)).toEqual({ price: 100, discountPct: 0 })
  })
})

describe('shopPrice — positive CHA discounts', () => {
  it('a +2 CHA modifier (score 14) discounts per chaShopDiscountPctPerMod', () => {
    const character: Character = { ...fighter, abilities: { ...baseAbilities, cha: 14 } }
    // mod +2 * 0.03/mod = 6% off
    expect(shopPrice(100, character)).toEqual({ price: 94, discountPct: 0.06 })
  })
})

describe('shopPrice — negative CHA marks prices up', () => {
  it('a -1 CHA modifier (score 8) is a signed markup, not a discount', () => {
    const character: Character = { ...fighter, abilities: { ...baseAbilities, cha: 8 } }
    // mod -1 * 0.03/mod = -3% (a markup)
    expect(shopPrice(100, character)).toEqual({ price: 103, discountPct: -0.03 })
  })
})

describe('shopPrice — a Bard stacks Silver Tongue on top of CHA', () => {
  it('adds the class feature discount to the CHA discount', () => {
    const bard: Character = { ...fighter, class: 'bard', abilities: { ...baseAbilities, cha: 14 } }
    // mod +2 * 0.03 = 6% CHA + 15% Silver Tongue = 21% off
    expect(shopPrice(100, bard)).toEqual({ price: 79, discountPct: 0.21 })
  })

  it("a Bard's Silver Tongue can outweigh a negative CHA, still a net discount", () => {
    const bard: Character = { ...fighter, class: 'bard', abilities: { ...baseAbilities, cha: 8 } }
    // mod -1 * 0.03 = -3% CHA + 15% Silver Tongue = 12% off
    expect(shopPrice(100, bard)).toEqual({ price: 88, discountPct: 0.12 })
  })
})

describe('shopPrice — clamps to a minimum of 1', () => {
  it('never rounds to zero or negative even with a huge discount', () => {
    const bard: Character = { ...fighter, class: 'bard', abilities: { ...baseAbilities, cha: 20 } }
    expect(shopPrice(1, bard).price).toBeGreaterThanOrEqual(1)
  })
})
