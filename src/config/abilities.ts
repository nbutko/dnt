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
  // WIS primary: + typing time budget (ms), per point of WIS modifier. The
  // one *linear* tempo lever on the player's own clock (content-plan-v2-
  // tuning.html §7 Finding 2/§8.2) — re-landed at Story 2 against the fight
  // length Story 1 restored, big enough that a WIS-heavy "behind" build buys
  // a genuinely more leisurely cadence (multiple seconds at a high mod), not
  // the pre-Story-2 token few hundred ms.
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
  // CHA flavor, Story 2: "charm" — cut to the monster's effective *accuracy*
  // per point of CHA modifier, distinct from the wpm cut above. Charm makes
  // the monster fumble its own line more (engine/monster-typing.ts's
  // monster.accuracy), lengthening its self-correction cycles and shrinking
  // its effective output — a second *linear* time-buyer alongside WIS
  // (content-plan-v2-tuning.html §7 Finding 2/§8.2), the pair that makes the
  // slow-typing, over-leveled "behind" corner winnable once htk is restored.
  chaCharmAccuracyCutPctPerMod: number
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
  // Story 2 (content-plan-v2-tuning-implementation.html): 300 -> 1200 —
  // measured against the sweep as a token few hundred ms at the old value
  // (barely denting a fixed reading buffer of 2000ms), 1200/mod makes a
  // +5-mod WIS build (a maxed "behind" tank) buy +6000ms, comparable to the
  // reading buffer itself and enough to swing speedBonus/expire outcomes on
  // the slow-typing, over-leveled corner.
  wisTimeBudgetMsPerMod: 1200,
  intEncounterBonusPerMod: 1,
  chaShopDiscountPctPerMod: 0.03,
  chaIntimidateWpmCutPctPerMod: 0.04,
  // Story 2: landed at the same order of magnitude as the wpm cut so the two
  // CHA flavors read as siblings — a +5-mod CHA build cuts monster accuracy
  // by 25% (floored, same 10%-of-original rule as the wpm cut below).
  chaCharmAccuracyCutPctPerMod: 0.05,
  mimicDeceptionDcByTier: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  damageScale: 1.6,
}

export default abilitiesConfig
