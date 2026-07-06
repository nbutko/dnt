import { describe, expect, it } from 'vitest'
import { CLASSES, getClass } from '../../config/classes'
import { getWeapon } from '../../config/weapons'
import type { CharacterClass } from '../../domain/character'
import { createRng } from '../rng'
import { resolveModifiers } from './modifiers'
import { createNewCharacter, DEFAULT_CREATION_CLASS, pickRandomName, randomCharacter } from './create'

describe('createNewCharacter', () => {
  it('builds a fresh level-1 character with no xp and no banked ASI', () => {
    const abilities = { str: 15, dex: 12, con: 14, int: 10, wis: 13, cha: 8 }
    const character = createNewCharacter('Bram', 'fighter', abilities)
    expect(character).toEqual({
      name: 'Bram',
      class: 'fighter',
      level: 1,
      xp: 0,
      abilities,
      pendingAsi: 0,
    })
  })

  it('rejects an unknown class id, matching getClass', () => {
    expect(() => createNewCharacter('Bram', 'paladin' as CharacterClass, {
      str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
    })).toThrow()
  })
})

describe('pickRandomName', () => {
  it('always returns a non-empty string, deterministically for a given seed', () => {
    const name = pickRandomName(createRng(3))
    expect(typeof name).toBe('string')
    expect(name.length).toBeGreaterThan(0)
    expect(pickRandomName(createRng(3))).toBe(name)
  })
})

describe('randomCharacter — the "one button = a complete hero" invariant', () => {
  it('produces a valid, fully-formed character for every class, with the class hit die applied', () => {
    CLASSES.forEach((classDef) => {
      const character = randomCharacter(createRng(11), classDef.id)
      expect(character.class).toBe(classDef.id)
      expect(character.level).toBe(1)
      expect(character.xp).toBe(0)
      expect(character.pendingAsi).toBe(0)
      expect(character.name.length).toBeGreaterThan(0)

      // The class's hit die, feature, and starting weapon are all derivable —
      // resolveModifiers (the seam) must accept this character without
      // throwing and produce a sane level-1 HP figure.
      const weapon = getWeapon(classDef.startingWeapon)
      const modifiers = resolveModifiers(character, weapon)
      expect(modifiers.maxHp).toBeGreaterThan(0)
      expect(modifiers.weaponDie).toBe(weapon.die)
    })
  })

  it('defaults to the wireframe\'s pre-selected class (Fighter) when none is passed', () => {
    const character = randomCharacter(createRng(5))
    expect(character.class).toBe(DEFAULT_CREATION_CLASS)
    expect(getClass(character.class).hitDie).toBe(10)
  })
})
