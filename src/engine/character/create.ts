// Turns a name + class + rolled ability scores into a fresh level-1 Character
// (m3-scope.html#creation) — pure so CharacterCreateScreen's "one button = a
// complete hero" default is exercisable headlessly, same spirit as Story 2's
// leveling.ts. Never imports React.

import { getClass } from '../../config/classes'
import names from '../../content/names.json'
import type { AbilityScores, Character, CharacterClass } from '../../domain/character'
import type { Rng } from '../../domain/types'
import { abilityRollsToScores, rollAbilityScores } from './ability-roll'

// The wireframe's default selected class chip (turn 1a: FIGHTER is shown
// pre-highlighted, the other three dimmed) — the "one button" default lands
// on this class rather than a random one, matching that exact mock.
export const DEFAULT_CREATION_CLASS: CharacterClass = 'fighter'

// Fresh, level 1, no XP, no banked ASI — getClass validates the class id up
// front (throws on garbage input, matching getClass's own precedent) even
// though the hit die/feature/starting weapon themselves are read later, at
// derived-stat time, via resolveModifiers/getClass — never stored redundantly
// on the Character (the derive-don't-store rule, m3-implementation.html).
export const createNewCharacter = (
  name: string,
  characterClass: CharacterClass,
  abilities: AbilityScores,
): Character => {
  getClass(characterClass)
  return {
    name,
    class: characterClass,
    level: 1,
    xp: 0,
    abilities,
    pendingAsi: 0,
  }
}

// A random pick from content/names.json — the NameField's default, and
// reused by randomCharacter below so the whole "one button" hero is buildable
// from a single seeded Rng.
export const pickRandomName = (rng: Rng): string => names[Math.floor(rng.next() * names.length)]

// The complete "one button = a complete hero" default: roll all six
// abilities, pick a random name, and land on the default class. Deterministic
// under a seeded rng, which is what makes it testable without React.
export const randomCharacter = (rng: Rng, characterClass: CharacterClass = DEFAULT_CREATION_CLASS): Character => {
  const abilities = abilityRollsToScores(rollAbilityScores(rng))
  const name = pickRandomName(rng)
  return createNewCharacter(name, characterClass, abilities)
}
