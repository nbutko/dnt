import { describe, expect, it } from 'vitest'
import type { Rng } from '../../domain/types'
import {
  DEFAULT_ENCOUNTER_ROLL_CONFIG,
  rollEncounter,
  type EncounterRollModifiers,
} from './encounter-roll'

// Same fixed-sequence fake as content/text-banks.test.ts — lets a test dictate
// exactly which d20 face(s) rollEncounter draws instead of hunting for a seed
// that happens to land there.
const fakeRng = (values: number[]): Rng => {
  let i = 0
  return {
    next: () => {
      const value = values[i % values.length]
      i += 1
      return value
    },
    sample: (mean) => mean,
  }
}

// floor(v*20)+1 -> natural. v just under 0.05 lands natural 1, just under
// 0.10 lands natural 2, etc.; v in [0.95, 1) lands natural 20.
const NAT = {
  1: 0.0,
  2: 0.06,
  6: 0.26,
  9: 0.41,
  15: 0.71,
  19: 0.91,
  20: 0.96,
} as const

const noBonus: EncounterRollModifiers = {
  encounterBonus: 0,
  hasAdvantage: false,
  fumbleImmune: false,
}

describe('rollEncounter', () => {
  it('bands a low total (2-7) as low', () => {
    const roll = rollEncounter(DEFAULT_ENCOUNTER_ROLL_CONFIG, noBonus, fakeRng([NAT[6]]))
    expect(roll.natural).toBe(6)
    expect(roll.total).toBe(6)
    expect(roll.band).toBe('low')
  })

  it('bands a mid total (8-13) as mid', () => {
    const roll = rollEncounter(DEFAULT_ENCOUNTER_ROLL_CONFIG, noBonus, fakeRng([NAT[9]]))
    expect(roll.natural).toBe(9)
    expect(roll.band).toBe('mid')
  })

  it('bands a high total (14-19) as high', () => {
    const roll = rollEncounter(DEFAULT_ENCOUNTER_ROLL_CONFIG, noBonus, fakeRng([NAT[15]]))
    expect(roll.natural).toBe(15)
    expect(roll.band).toBe('high')
  })

  it('a bonus can push an ordinary roll up a band', () => {
    // natural 6 (low on its own) + a +5 item/class bonus totals 11 -> mid.
    const mods: EncounterRollModifiers = { ...noBonus, encounterBonus: 5 }
    const roll = rollEncounter(DEFAULT_ENCOUNTER_ROLL_CONFIG, mods, fakeRng([NAT[6]]))
    expect(roll.natural).toBe(6)
    expect(roll.total).toBe(11)
    expect(roll.band).toBe('mid')
    expect(roll.fumble).toBe(false)
    expect(roll.inspired).toBe(false)
  })

  it('a natural 1 fumbles: low band, no crits, regardless of any bonus', () => {
    const mods: EncounterRollModifiers = { ...noBonus, encounterBonus: 10 }
    const roll = rollEncounter(DEFAULT_ENCOUNTER_ROLL_CONFIG, mods, fakeRng([NAT[1]]))
    expect(roll.natural).toBe(1)
    expect(roll.fumble).toBe(true)
    expect(roll.band).toBe('low')
  })

  it('fumbleImmune (Potion of Heroism) cancels the fumble face', () => {
    const mods: EncounterRollModifiers = { ...noBonus, fumbleImmune: true }
    const roll = rollEncounter(DEFAULT_ENCOUNTER_ROLL_CONFIG, mods, fakeRng([NAT[1]]))
    expect(roll.natural).toBe(1)
    expect(roll.fumble).toBe(false)
    // No longer pinned to low band once immune — reads the ordinary total (1).
    expect(roll.band).toBe('low')
  })

  it('a natural 20 inspires: high band, guaranteed first crit — a bonus cannot manufacture this from a lower natural', () => {
    const roll = rollEncounter(DEFAULT_ENCOUNTER_ROLL_CONFIG, noBonus, fakeRng([NAT[20]]))
    expect(roll.natural).toBe(20)
    expect(roll.inspired).toBe(true)
    expect(roll.band).toBe('high')
  })

  it('a bonus pushing a non-natural-20 total to 20+ never sets inspired', () => {
    // natural 19 + a +5 bonus totals 24, but the natural die was 19, not 20.
    const mods: EncounterRollModifiers = { ...noBonus, encounterBonus: 5 }
    const roll = rollEncounter(DEFAULT_ENCOUNTER_ROLL_CONFIG, mods, fakeRng([NAT[19]]))
    expect(roll.natural).toBe(19)
    expect(roll.total).toBe(24)
    expect(roll.inspired).toBe(false)
    expect(roll.band).toBe('high')
  })

  it('advantage keeps the higher of two d20s', () => {
    const mods: EncounterRollModifiers = { ...noBonus, hasAdvantage: true }
    // First die low (6), second die high (15) -> keeps 15.
    const roll = rollEncounter(
      DEFAULT_ENCOUNTER_ROLL_CONFIG,
      mods,
      fakeRng([NAT[6], NAT[15]]),
    )
    expect(roll.natural).toBe(15)
    expect(roll.band).toBe('high')
  })

  it('advantage still keeps the higher when the first die rolled is bigger', () => {
    const mods: EncounterRollModifiers = { ...noBonus, hasAdvantage: true }
    const roll = rollEncounter(
      DEFAULT_ENCOUNTER_ROLL_CONFIG,
      mods,
      fakeRng([NAT[19], NAT[6]]),
    )
    expect(roll.natural).toBe(19)
  })

  it('without advantage only draws one die from the rng', () => {
    // A single-value rng would repeat forever if a second draw were made
    // without advantage; feeding two distinct values and asserting only the
    // first is used proves no second draw happened.
    const roll = rollEncounter(DEFAULT_ENCOUNTER_ROLL_CONFIG, noBonus, fakeRng([NAT[6], NAT[20]]))
    expect(roll.natural).toBe(6)
  })

  it('is deterministic for the same rng sequence', () => {
    const a = rollEncounter(DEFAULT_ENCOUNTER_ROLL_CONFIG, noBonus, fakeRng([NAT[9]]))
    const b = rollEncounter(DEFAULT_ENCOUNTER_ROLL_CONFIG, noBonus, fakeRng([NAT[9]]))
    expect(a).toEqual(b)
  })
})
