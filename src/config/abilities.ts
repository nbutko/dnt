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
  // INT primary: the prompt tier cap before any INT bonus (matches the M2
  // baseline `wordsmithMaxTier` default of tier 1 — engine/progression/
  // skill-effects.ts), plus how many extra tiers each point of INT modifier
  // adds on top.
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
  // Multiplies (roll(weaponDie) + weaponAbilityMod) so per-hit damage lands
  // near today's flat combat.baseDamage = 10 — the number Story 13's theory
  // pass pins first, everything else rebalances around it.
  damageScale: number
}

const abilitiesConfig: AbilitiesConfig = {
  strDamagePctPerMod: 0.05,
  dexCritChancePctPerMod: 0.02,
  dexDodgeChancePctPerMod: 0.03,
  wisTimeBudgetMsPerMod: 300,
  baseIntTierCap: 1,
  intTierCapStepPerMod: 1,
  chaShopDiscountPctPerMod: 0.03,
  chaIntimidateWpmCutPctPerMod: 0.04,
  mimicDeceptionDcByTier: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  damageScale: 1.5,
}

export default abilitiesConfig
