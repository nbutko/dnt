// The M2 skill tree's SkillBranchId/SkillTreeState (m2-implementation.html
// Story 4) are retired here in M3 Story 3 — the seam's *input* is now a
// Character + Weapon + ActiveBuff[] (engine/character/modifiers.ts), not a
// purchased-node count. config/skill-tree.ts and ui/inn/SkillBranch.tsx keep
// a local copy of the id union for their own (still-dead, Story-5-scheduled-
// for-deletion) types — they don't reach back into this file for it anymore.

// What a Character + equipped Weapon + active consumable buffs add up to for
// one battle, folded into one bag by resolveModifiers()
// (engine/character/modifiers.ts) so battle-store never has to know which
// ability, class feature, or item produced which number. Same output *role*
// as M2's narrower PlayerModifiers, widened for M3's ability/weapon/buff
// surface (m3-implementation.html#seams, seam 1).
export interface PlayerModifiers {
  // -- Endurance/HP (CON + level) --
  maxHp: number
  maxHearts: number
  // -- Focus/WIS: typing time budget --
  timeBudgetBonusMs: number
  // -- The encounter d20 (engine/dice/, Story 6): proficiency bonus + the INT
  // nudge (INT no longer caps the tier — content-plan-v2-tuning.html) + any
  // item/class flat bonus (e.g. Luckstone), and whether it rolls twice --
  encounterBonus: number
  hasAdvantage: boolean
  // -- Luck/DEX: crits and dodge --
  critChanceBonus: number
  critDamageMult: number
  powerUpMult: number
  dodgeChance: number
  // -- CHA: enemy intimidation --
  intimidateWpmCut: number
  // -- CHA, Story 2: "charm" — cut to the monster's effective accuracy
  // (engine/monster-typing.ts's monster.accuracy), a second linear
  // time-buyer distinct from intimidateWpmCut (content-plan-v2-tuning.html
  // §7 Finding 2/§8.2) --
  charmAccuracyCut: number
  // -- The equipped weapon (Story 7 reads these in engine/damage.ts) --
  weaponDie: number
  weaponAbilityMod: number
  critRange: number
  // -- Class features + item flags --
  guaranteedFirstCrit: boolean
  fumbleImmune: boolean
  sneakAttackDice: number
  secondWind: { hpThresholdPct: number; healPct: number } | null
  arcaneCritMult: number
}
