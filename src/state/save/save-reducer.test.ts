import { describe, expect, it } from 'vitest'
import type { Character } from '../../domain/character'
import { defaultSave } from '../../domain/save'
import {
  applyAsi,
  award,
  buyItem,
  buyWeapon,
  consumeItem,
  createCharacter,
  equipWeapon,
  gainXp,
  recordDefeat,
  saveReducer,
  unlockTier,
} from './save-reducer'

const makeCharacter = (overrides: Partial<Character> = {}): Character => ({
  name: 'Aldric',
  class: 'fighter',
  level: 1,
  xp: 0,
  abilities: { str: 15, dex: 12, con: 14, int: 10, wis: 13, cha: 8 },
  pendingAsi: 0,
  ...overrides,
})

describe('saveReducer', () => {
  it('award always accumulates coins; xp only folds in once a character exists', () => {
    const s1 = saveReducer(defaultSave(), award(10, 5))
    expect(s1.coins).toBe(10)
    expect(s1.character).toBeNull()

    const withHero = { ...defaultSave(), character: makeCharacter() }
    const s2 = saveReducer(withHero, award(3, 7))
    expect(s2.coins).toBe(3)
    expect(s2.character?.xp).toBe(7)
  })

  it('createCharacter sets the character from null', () => {
    const hero = makeCharacter()
    const next = saveReducer(defaultSave(), createCharacter(hero))
    expect(next.character).toEqual(hero)
  })

  it('gainXp accumulates onto the character and no-ops without one', () => {
    const noHero = saveReducer(defaultSave(), gainXp(100))
    expect(noHero.character).toBeNull()

    const start = { ...defaultSave(), character: makeCharacter({ xp: 50 }) }
    const next = saveReducer(start, gainXp(25))
    expect(next.character?.xp).toBe(75)
  })

  it('applyAsi spends pendingAsi points into abilities and no-ops without a character', () => {
    const noHero = saveReducer(defaultSave(), applyAsi({ str: 1 }))
    expect(noHero.character).toBeNull()

    const start = { ...defaultSave(), character: makeCharacter({ pendingAsi: 2 }) }
    const next = saveReducer(start, applyAsi({ str: 1, dex: 1 }))
    expect(next.character?.abilities.str).toBe(16)
    expect(next.character?.abilities.dex).toBe(13)
    expect(next.character?.pendingAsi).toBe(0)
  })

  it('applyAsi never drives pendingAsi negative', () => {
    const start = { ...defaultSave(), character: makeCharacter({ pendingAsi: 1 }) }
    const next = saveReducer(start, applyAsi({ con: 2 }))
    expect(next.character?.pendingAsi).toBe(0)
  })

  it('equipWeapon swaps the equipped id', () => {
    const next = saveReducer(defaultSave(), equipWeapon('longsword'))
    expect(next.equippedWeapon).toBe('longsword')
  })

  it('buyWeapon deducts the passed-in price and adds the weapon once', () => {
    const start = { ...defaultSave(), coins: 100 }
    const next = saveReducer(start, buyWeapon('longsword', 30))
    expect(next.coins).toBe(70)
    expect(next.inventory.weapons).toEqual(['dagger', 'longsword'])

    const again = saveReducer(next, buyWeapon('longsword', 30))
    expect(again.inventory.weapons).toEqual(['dagger', 'longsword'])
  })

  it('buyItem deducts price and increments the owned count', () => {
    const start = { ...defaultSave(), coins: 50 }
    const s1 = saveReducer(start, buyItem('potion-healing', 10))
    expect(s1.coins).toBe(40)
    expect(s1.inventory.consumables['potion-healing']).toBe(1)

    const s2 = saveReducer(s1, buyItem('potion-healing', 10))
    expect(s2.inventory.consumables['potion-healing']).toBe(2)
  })

  it('consumeItem decrements the owned count and floors at zero', () => {
    const start = {
      ...defaultSave(),
      inventory: { ...defaultSave().inventory, consumables: { ...defaultSave().inventory.consumables, luckstone: 1 } },
    }
    const s1 = saveReducer(start, consumeItem('luckstone'))
    expect(s1.inventory.consumables.luckstone).toBe(0)

    const s2 = saveReducer(s1, consumeItem('luckstone'))
    expect(s2.inventory.consumables.luckstone).toBe(0)
  })

  it('unlockTier is monotonic — never lowers the current value', () => {
    const start = { ...defaultSave(), highestUnlockedTier: 3 }
    expect(saveReducer(start, unlockTier(5)).highestUnlockedTier).toBe(5)
    expect(saveReducer(start, unlockTier(1)).highestUnlockedTier).toBe(3)
  })

  it('recordDefeat adds a unique monster id and increments battlesWon', () => {
    const s1 = saveReducer(defaultSave(), recordDefeat('slime'))
    expect(s1.monstersDefeated).toEqual(['slime'])
    expect(s1.stats.battlesWon).toBe(1)

    const s2 = saveReducer(s1, recordDefeat('slime'))
    expect(s2.monstersDefeated).toEqual(['slime'])
    expect(s2.stats.battlesWon).toBe(2)

    const s3 = saveReducer(s2, recordDefeat('goblin'))
    expect(s3.monstersDefeated).toEqual(['slime', 'goblin'])
  })
})
