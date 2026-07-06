// 4d6-drop-lowest ability rolling (m3-scope.html#creation, wireframe turn 1) —
// pure and headless so CharacterCreateScreen's "one button = a complete hero"
// default (and the "Roll again" re-roll) can be exercised and tested without
// React. Takes the same Rng interface as engine/rng.ts's createRng.

import type { Ability, AbilityScores } from '../../domain/character'
import type { Rng } from '../../domain/types'

const D6_SIDES = 6
const DICE_PER_ABILITY = 4

// The wireframe's card order (STRENGTH, DEXTERITY, CONSTITUTION, INTELLIGENCE,
// WISDOM, CHARISMA) — every ability is rolled straight into its own slot, no
// best-to-worst reassignment (m3-implementation.html Story 4: "a sensible
// standard-array-style assignment" — straight rolls are the simplest one, and
// match the wireframe's un-sorted example scores).
export const ABILITY_ORDER: readonly Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

export interface AbilityRoll {
  // The 4 rolled d6 values, in roll order.
  dice: readonly number[]
  // Index into `dice` of the die that got dropped (the lowest; ties keep the
  // first one seen, matching a human resolving a tie left-to-right).
  droppedIndex: number
  // Sum of the 3 kept dice — always lands in [3, 18].
  total: number
}

const rollD6 = (rng: Rng): number => Math.floor(rng.next() * D6_SIDES) + 1

// One ability score: roll 4d6, drop the lowest, sum the rest.
export const rollAbility = (rng: Rng): AbilityRoll => {
  const dice = Array.from({ length: DICE_PER_ABILITY }, () => rollD6(rng))
  let droppedIndex = 0
  dice.forEach((value, index) => {
    if (value < dice[droppedIndex]) droppedIndex = index
  })
  const total = dice.reduce((sum, value, index) => (index === droppedIndex ? sum : sum + value), 0)
  return { dice, droppedIndex, total }
}

// All six abilities in one pass, in ABILITY_ORDER — this is "the roll," the
// unit AbilityRoller's reroll button redoes wholesale.
export const rollAbilityScores = (rng: Rng): Record<Ability, AbilityRoll> => {
  const rolls = {} as Record<Ability, AbilityRoll>
  ABILITY_ORDER.forEach((ability) => {
    rolls[ability] = rollAbility(rng)
  })
  return rolls
}

// Flattens a roll set down to the plain AbilityScores a Character stores.
export const abilityRollsToScores = (rolls: Record<Ability, AbilityRoll>): AbilityScores => {
  const scores = {} as AbilityScores
  ABILITY_ORDER.forEach((ability) => {
    scores[ability] = rolls[ability].total
  })
  return scores
}
