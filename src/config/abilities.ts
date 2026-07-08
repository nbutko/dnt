// Every per-point ability MAGNITUDE in the game — how much a +1 modifier is
// worth in each formula. engine/character/modifiers.ts (Story 3) is the only
// consumer. Corralling every one of these numbers here means the M5 tuning
// pass (roadmap.html#m5) is a values edit, never a code change
// (m3-implementation.html "why config/abilities.ts is its own file, empty of
// logic"). Every value below is a Story 13 placeholder, not a feel decision —
// see m3-scope.html#open "Per-point magnitudes."

export interface AbilitiesConfig {
  // STR primary (m3-scope.html#abilities): + melee/finesse attack damage, as
  // a fraction of base hit damage, per point of STR modifier.
  strDamagePctPerMod: number
  // DEX primary: + crit chance per point of DEX modifier (added to the
  // equipped weapon's base crit chance).
  dexCritChancePctPerMod: number
  // DEX flavor: chance to negate an incoming monster hit ("Dodged!"), per
  // point of DEX modifier.
  dexDodgeChancePctPerMod: number
  // WIS primary: + typing time budget (ms), per point of WIS modifier.
  wisTimeBudgetMsPerMod: number
  // INT primary: how much each point of INT modifier adds to the encounter
  // d20 (engine/dice/encounter-roll.ts), on top of proficiency. INT no longer
  // *caps* the served tier — the M4/M5 retune (content-plan-v2-tuning.html)
  // made the full [N, N+2] window always reachable and turned INT into a
  // *nudge* on the roll toward the high band, so a low-INT reader is never
  // walled out of level-appropriate content, only less likely to be pushed to
  // the dungeon's hardest tier. Placeholder magnitude, sim-tuned.
  intEncounterBonusPerMod: number
  // CHA primary: Shop price discount (%), per point of CHA modifier —
  // signed, so a negative CHA marks prices up (m3-scope.html#shop).
  chaShopDiscountPctPerMod: number
  // CHA flavor: cut to the monster's effective wpm, per point of CHA
  // modifier (m3-scope.html#ability-mechanics).
  chaIntimidateWpmCutPctPerMod: number
  // Mimic-sense deception DC, indexed by dungeon tier (index 0 = tier 1) —
  // climbs so deeper mimics hide better (m3-scope.html#mimic-sense).
  mimicDeceptionDcByTier: readonly number[]
  // Multiplies (dice-total + weaponAbilityMod) so a baseline character's
  // hits-to-kill (engine/sim/balance.ts's `hitsToKill`) lands near the
  // pre-Story-7 flat-baseDamage band. Landed at 1.6 against a Fighter's
  // starting longsword (d8, STR +2) vs. the Grassland roster — see
  // balance.test.ts's "dice-era hits-to-kill" block and m3-implementation.html
  // Story 7's report for the arithmetic. Story 13's full theory pass owns the
  // real tuning; this is a placeholder landed by measurement, not derivation.
  damageScale: number
}

const abilitiesConfig: AbilitiesConfig = {
  strDamagePctPerMod: 0.05,
  dexCritChancePctPerMod: 0.02,
  dexDodgeChancePctPerMod: 0.03,
  wisTimeBudgetMsPerMod: 300,
  intEncounterBonusPerMod: 1,
  chaShopDiscountPctPerMod: 0.03,
  chaIntimidateWpmCutPctPerMod: 0.04,
  mimicDeceptionDcByTier: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  damageScale: 1.6,
}

export default abilitiesConfig
