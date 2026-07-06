// The encounter d20 (m3-scope.html#encounter-roll, wireframe turn 4) — rolled
// once, before the clock starts, to pick which of the dungeon's three
// prompt-difficulty bands the player types this fight. Pure + headless, like
// engine/character/ability-roll.ts's 4d6 roll: takes the project's seeded Rng
// (engine/rng.ts) so a whole encounter is reproducible/testable.

import type { PlayerModifiers } from '../../domain/progression'
import type { Rng } from '../../domain/types'

export type EncounterBand = 'low' | 'mid' | 'high'

// Total thresholds transcribed from the scope's pseudocode:
//   natural 1   -> FUMBLE:   low band, no crits, damage x0.75
//   total 2-7   -> low band
//   total 8-13  -> mid band
//   total 14-19 -> high band
//   natural 20  -> INSPIRED: high band, guaranteed first-hit crit
// Only the low/mid/high boundaries live here — fumble/inspired are natural-
// die special cases handled directly in rollEncounter, not via these totals.
export interface EncounterRollConfig {
  lowMax: number
  midMax: number
}

export const DEFAULT_ENCOUNTER_ROLL_CONFIG: EncounterRollConfig = {
  lowMax: 7,
  midMax: 13,
}

export interface EncounterRoll {
  // The kept d20 face (under advantage, the higher of two) — the ONLY thing
  // fumble/inspired ever key off, so no bonus can manufacture or erase one.
  natural: number
  // natural + mods.encounterBonus. Story 3 already folds proficiency into
  // encounterBonus (m3-implementation.html seam B), so it is NOT re-added
  // here — double-counting it would silently inflate every band roll.
  total: number
  band: EncounterBand
  fumble: boolean
  inspired: boolean
}

const D20_SIDES = 20

const rollD20 = (rng: Rng): number => Math.floor(rng.next() * D20_SIDES) + 1

const bandForTotal = (total: number, cfg: EncounterRollConfig): EncounterBand => {
  if (total <= cfg.lowMax) return 'low'
  if (total <= cfg.midMax) return 'mid'
  return 'high'
}

// The subset of PlayerModifiers the roll actually reads — kept narrow so a
// caller (or a test) can hand in a partial object instead of a full
// PlayerModifiers bag.
export type EncounterRollModifiers = Pick<
  PlayerModifiers,
  'encounterBonus' | 'hasAdvantage' | 'fumbleImmune'
>

export const rollEncounter = (
  cfg: EncounterRollConfig,
  mods: EncounterRollModifiers,
  rng: Rng,
): EncounterRoll => {
  const first = rollD20(rng)
  // Advantage (Rogue Cunning / a Guidance buff): roll twice, keep the higher
  // — exactly as in D&D. Rolling the second die unconditionally when
  // hasAdvantage is false would silently desync every other rng draw in the
  // fight for non-advantage characters, so it's gated.
  const second = mods.hasAdvantage ? rollD20(rng) : first
  const natural = Math.max(first, second)

  // A Potion of Heroism (wireframe t4b: "makes you immune") cancels the
  // fumble face outright — the natural 1 still shows on the die, but it no
  // longer degrades the fight.
  const fumble = natural === 1 && !mods.fumbleImmune
  const inspired = natural === 20

  const total = natural + mods.encounterBonus

  // Fumble/inspired pin their band per the scope's pseudocode regardless of
  // the modified total (a nat-1 always lands low band even if a Luckstone's
  // bonus would otherwise total it into mid) — everything else reads the
  // total, so a bonus item can still push an ordinary roll up a band.
  let band: EncounterBand = bandForTotal(total, cfg)
  if (fumble) band = 'low'
  if (inspired) band = 'high'

  return { natural, total, band, fumble, inspired }
}
