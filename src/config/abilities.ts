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
  // INT primary: the prompt tier cap before any INT bonus, plus how many
  // extra tiers each point of INT modifier adds on top. Story 13 landed
  // these well above the M2 `wordsmithMaxTier` baseline of 1 (engine/
  // progression/skill-effects.ts) that seeded the original placeholder: with
  // config/dungeon-tiers.ts's textTierRange climbing from [1,3] at tier 1 to
  // [8,10] at tier 11, a flat cap of 1 (+1/mod) left every non-Wizard build
  // gated at servedTier 1 against a targetTier as high as 3 from the very
  // first dungeon — engine/damage.ts's tierGatePenalty *squares* that ratio,
  // so it wasn't a strategic tradeoff, it was a wall (balance.test.ts's
  // Story 13 sweep caught it: hitsToKill in the hundreds for every class but
  // Wizard). 3 (+3/mod) lets a character with no INT investment at all still
  // read tier 1-3 dungeons cleanly, and a modest, non-maxed INT (a +1 or +2
  // mod from one ASI) keeps pace through the mid ladder — full ladder
  // coverage still asks for real INT investment, which is the intended
  // "pump INT to read harder words" choice (m3-scope.html#leveling), not a
  // prerequisite just to not be crushed.
  baseIntTierCap: number
  intTierCapStepPerMod: number
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
  baseIntTierCap: 3,
  intTierCapStepPerMod: 3,
  chaShopDiscountPctPerMod: 0.03,
  chaIntimidateWpmCutPctPerMod: 0.04,
  mimicDeceptionDcByTier: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  damageScale: 1.6,
}

export default abilitiesConfig
