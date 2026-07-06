// WIS mimic sense (m3-scope.html#mimic-sense, wireframe turn 5) — a HIDDEN
// d20 + WIS mod + proficiency check rolled the instant a chest node is
// selected, graded against that dungeon tier's mimic deception DC
// (config/abilities.ts's mimicDeceptionDcByTier). Pure + headless, same
// shape as engine/dice/encounter-roll.ts's rollEncounter, so ui/dungeon/
// DungeonScreen.tsx can call it and decide whether to show the "teeth on
// edge" warning modal without any of the roll logic living in a component.

import type { Rng } from '../../domain/types'

export interface MimicSenseModifiers {
  wisMod: number
  proficiencyBonus: number
  // Rogue "Expertise" (config/classes.ts's cunning.mimicExpertise): doubles
  // proficiency on this specific check, nothing else.
  expertise: boolean
}

export interface MimicSenseResult {
  // The raw d20 face — kept for the "GM whisper" debug readout (wireframe
  // turn 5a's hidden footer), never shown to the player directly.
  natural: number
  total: number
  dc: number
  // True only when this really is a mimic AND the total beat the DC. A real
  // chest can never produce true here — see the `isMimic` gate below — so a
  // caller can trust `success` as "warn the player" outright.
  success: boolean
}

const D20_SIDES = 20

const rollD20 = (rng: Rng): number => Math.floor(rng.next() * D20_SIDES) + 1

// `isMimic` is threaded in (rather than assumed true because only mimic
// chests are ever supposed to call this) so the "a real chest never warns"
// rule is a hard invariant of the function itself, not a promise every call
// site has to keep — see m3-scope.html's callout: "Only a mimic can ever
// trigger it — a real chest never does."
export const rollMimicSense = (
  isMimic: boolean,
  dc: number,
  mods: MimicSenseModifiers,
  rng: Rng,
): MimicSenseResult => {
  const natural = rollD20(rng)
  const proficiency = mods.expertise ? mods.proficiencyBonus * 2 : mods.proficiencyBonus
  const total = natural + mods.wisMod + proficiency
  const success = isMimic && total >= dc

  return { natural, total, dc, success }
}
