import type { CombatConfig, DamageResult, Rng, TextTier } from '../domain/types'
import { rollDie } from './rng'

// Longer prompts hit harder — the direct payoff for the skill tree unlocking
// longer text. Below reference length, clamped to a floor so a short prompt
// can't drive damage to ~0. Above reference length, soft-capped with
// diminishing returns (content-plan-v2-tuning.html §8.1): the M4 content
// wiring stretched prompts from ~220 chars to ~2000, and the old
// `1 + (charCount-referenceLength)/referenceLength` was uncapped above 1, so
// a 2000-char boss prompt yielded a ~166x multiplier that one-shot bosses
// regardless of their HP (§7 Finding 1). The knee below is a soft asymptote,
// not a hard clip — every additional char still adds *something*, but the
// total can never exceed `lengthFactorCap`, which lets content/monsters.json
// author boss HP against a bounded hit distribution (see engine/sim/
// balance.ts's hitMagnitudes).
//
// Shaped as a rational (Michaelis-Menten-style) knee rather than an
// exponential one: `softened = capExcess * excess / (excess + capExcess)`.
// Both shapes start at slope 1 right at reference length (so short/moderate
// prompts are barely affected, same as the old linear formula) and both
// asymptote to `lengthFactorCap`, but the exponential form saturates FAR too
// fast for this game's dynamic range — content spans a ~150x spread in
// prompt length (16 chars at tier 1 to ~2000 at tier 14), and an exponential
// knee was already >99% saturated by tier 12, making tiers 12-14 all measure
// the same lengthFactor despite a 700 -> 2000 char difference (a de facto
// hard clip, exactly what this shape is supposed to avoid). The rational
// form's much longer tail (half the ceiling's remaining room is only used up
// once excess = capExcess, and it keeps inching up well past that) keeps
// every tier distinguishable while still bounding the runaway.
export const lengthFactor = (charCount: number, combat: CombatConfig): number => {
  const raw = 1 + (charCount - combat.referenceLength) / combat.referenceLength
  if (raw <= 1) return Math.max(combat.lengthFactorFloor, raw)
  const excess = raw - 1
  const capExcess = combat.lengthFactorCap - 1
  const softenedExcess = (capExcess * excess) / (excess + capExcess)
  return 1 + softenedExcess
}

// 2x for a same-instant finish, down to 1x at exactly the time limit. Since an
// attack can only submit on an exact match, speed is the only quality axis
// left to reward (see game-design.html#damage) — a typo already cost time.
export const speedBonus = (timeUsedMs: number, timeLimitMs: number): number => {
  const usedFraction = Math.min(Math.max(timeUsedMs / timeLimitMs, 0), 1)
  return 1 + (1 - usedFraction)
}

export interface CritRuleOptions {
  // guaranteedFirstCrit's specific swing (this fight's first landed hit) —
  // always crits, no roll needed. Threaded in by engine/battle.ts, which
  // tracks whether the first hit has landed yet.
  forceCrit?: boolean
  // A fumble fight (encounter d20 natural 1, engine/dice/encounter-roll.ts)
  // — never crits, regardless of criticalChance. Wired end-to-end since
  // Story 12 (state/battle-store.ts's resolveFightTier -> engine/battle.ts's
  // BattleConfig.noCrits -> here); this doc comment used to (incorrectly)
  // call it unwired — see the CLAUDE.md gotcha, which only ever flagged
  // critChanceBonus/critRange/critDamageMult as the dead paths, not this one.
  noCrits?: boolean
  // DEX's dexCritChancePctPerMod + any item bonus (Oil of Sharpness'
  // crit-boost effect), already summed into PlayerModifiers.critChanceBonus
  // by engine/character/modifiers.ts's resolveModifiers — added on top of
  // combat.criticalChance. Defaults to 0 so a bare call (an older test, or
  // sim code that doesn't care about DEX/items) behaves exactly as it did
  // before Story 3 wired this in.
  critChanceBonus?: number
}

// A weapon's critRange narrows the crit window below the flat
// combat.criticalChance baseline: critRange 19 means a natural-19-or-20
// "hit" instead of just 20, i.e. two chances in twenty instead of one. Each
// point below 20 is worth one of those twenty equally-likely chances — 1/20
// = 5% — folded in on top of combat.criticalChance and any DEX/item
// critChanceBonus. The CLAUDE.md gotcha's "coherent, tunable model" for a
// number (PlayerModifiers.critRange / weapon.critRange) that used to sit on
// the modifiers bag completely unread.
const CRIT_RANGE_SIDES = 20
export const critRangeChanceBonus = (critRange: number): number =>
  Math.max(0, (CRIT_RANGE_SIDES - critRange) / CRIT_RANGE_SIDES)

// Whether one swing crits. combat.criticalChance stays the per-hit baseline
// trigger (Story 7 only retires the flat criticalDamageMultiplier for the
// player, rolling extra dice instead — see computeDamage below); Story 3 adds
// critChanceBonus on top, folded by the caller from DEX + the weapon's
// critRange + any item bonus.
export const rollIsCrit = (combat: CombatConfig, rng: Rng, options: CritRuleOptions = {}): boolean => {
  const { forceCrit = false, noCrits = false, critChanceBonus = 0 } = options
  if (noCrits) return false
  if (forceCrit) return true
  const chance = Math.min(1, Math.max(0, combat.criticalChance + critChanceBonus))
  return rng.next() < chance
}

// Punishes being served a lower tier than the encounter d20's band rolled
// into — the served prompt is already easier (shorter/simpler), but that
// alone is only a linear discount on damage, which speedBonus can offset.
// Squaring the tier ratio makes the loss outrun anything speed can buy back
// (m2-scope.html#wordsmith-gate, now INT/band-driven instead of Wordsmith):
// 1 at/above the target tier, 0.56 at 6/8, 0.25 at 4/8.
//
// M3 Story 6 (m3-implementation.html finding D) reinterprets `targetTier`:
// it used to be the monster's own textTier, but the player's served tier now
// comes from the encounter d20's band (engine/dice/band.ts's
// bandToServedTier), not the monster — so the gate compares against that
// band's target tier instead. The monster's textTier keeps governing only
// the line the monster itself types. Same squared-ratio math either way.
export const tierGatePenalty = (servedTier: TextTier, targetTier: TextTier): number =>
  servedTier >= targetTier ? 1 : (servedTier / targetTier) ** 2

// Back-compat fallbacks only — real callers (state/battle-store.ts,
// engine/sim/balance.ts) always thread the equipped weapon's die/mod and
// config/abilities.ts's damageScale explicitly. These let a bare call (an
// older test, or sim code that doesn't care about a specific weapon) still
// compile and produce a sane, non-zero hit rather than requiring every
// caller to know about weapons.
const DEFAULT_WEAPON_DIE = 6
const DEFAULT_WEAPON_ABILITY_MOD = 0
const DEFAULT_DAMAGE_SCALE = 1.5
const DEFAULT_CRIT_COUNT = 2
const DEFAULT_CRIT_RANGE = 20

export interface ComputeDamageParams {
  charCount: number
  timeUsedMs: number
  timeLimitMs: number
  combat: CombatConfig
  rng: Rng
  // The equipped weapon (Story 7: engine/character/modifiers.ts's
  // PlayerModifiers.weaponDie/weaponAbilityMod).
  weaponDie?: number
  weaponAbilityMod?: number
  // config/abilities.ts's damageScale — the one number that keeps the rolled
  // dice near today's flat combat.baseDamage feel.
  damageScale?: number
  // Dice rolled on a crit: 2 normally, 3 for the Wizard's arcane crit
  // (PlayerModifiers.arcaneCritMult).
  critCount?: number
  powerUpMultiplier?: number
  tierGatePenalty?: number
  // This fight's crit rule (guaranteedFirstCrit / a fumble) — see
  // rollIsCrit above.
  forceCrit?: boolean
  noCrits?: boolean
  // Story 3: DEX's dexCritChancePctPerMod + any item bonus (Oil of
  // Sharpness), already summed into PlayerModifiers.critChanceBonus.
  // Defaults to 0 (no bonus) — the CLAUDE.md gotcha's first dead field.
  critChanceBonus?: number
  // Story 3: the equipped weapon's crit range (PlayerModifiers.critRange) —
  // 20 by default (only a natural-20-equivalent crits); folded into the
  // effective crit chance via critRangeChanceBonus above. The gotcha's
  // second dead field.
  critRange?: number
  // Story 3: Oil of Sharpness's critDamageMultBonus, folded into
  // PlayerModifiers.critDamageMult by resolveModifiers (1 with no buff
  // active) — multiplies ONLY a crit's baseHit, stacking with (not
  // replacing) the extra dice critCount already rolls. The gotcha's third
  // dead field.
  critDamageMult?: number
  // A fumble also caps damage at this flat multiplier (m3-scope.html#open:
  // "the fumble/inspiration magnitudes") — 1 (no cap) outside a fumble.
  fumbleDamageMultiplier?: number
  // Rogue Sneak Attack (Story 11, PlayerModifiers.sneakAttackDice): how many
  // extra d6 fold into this swing when it qualifies (see forceSneakAttack).
  // 0 (the default) means no Sneak Attack feature at all.
  sneakAttackDice?: number
  // engine/battle.ts's job, not this function's: whether THIS swing is the
  // fight's first landed hit (Sneak Attack always applies there, crit or
  // not). A crit applies Sneak Attack regardless of this flag — see
  // `appliesSneakAttack` below.
  forceSneakAttack?: boolean
}

// Base hit = (sum of `critCount` weapon-die rolls on a crit, else 1 roll,
// + weaponAbilityMod) x damageScale x (critDamageMult, on a crit only) —
// replacing the old flat baseDamage x criticalDamageMultiplier
// (m3-implementation.html Story 7, game-design.html#damage). Rolling extra
// dice on a crit is the D&D-correct reading of "a crit rolls the die twice"
// (thrice for arcane): roll `critCount` dice and sum them, rather than
// rolling once and doubling the result. critDamageMult (Story 3, Oil of
// Sharpness) is a SEPARATE, stacking multiplier on top of that — the item
// reads as "your crits hit harder," not "you crit more dice."
export const computeDamage = (params: ComputeDamageParams): DamageResult => {
  const {
    charCount,
    timeUsedMs,
    timeLimitMs,
    combat,
    rng,
    weaponDie = DEFAULT_WEAPON_DIE,
    weaponAbilityMod = DEFAULT_WEAPON_ABILITY_MOD,
    damageScale = DEFAULT_DAMAGE_SCALE,
    critCount = DEFAULT_CRIT_COUNT,
    powerUpMultiplier = 1,
    tierGatePenalty: gatePenalty = 1,
    forceCrit = false,
    noCrits = false,
    critChanceBonus = 0,
    critRange = DEFAULT_CRIT_RANGE,
    critDamageMult = 1,
    fumbleDamageMultiplier = 1,
    sneakAttackDice = 0,
    forceSneakAttack = false,
  } = params
  const lf = lengthFactor(charCount, combat)
  const sb = speedBonus(timeUsedMs, timeLimitMs)
  const totalCritChanceBonus = critChanceBonus + critRangeChanceBonus(critRange)
  const isCrit = rollIsCrit(combat, rng, { forceCrit, noCrits, critChanceBonus: totalCritChanceBonus })
  const rollCount = isCrit ? critCount : 1
  const weaponDiceRolled = Array.from({ length: rollCount }, () => rollDie(rng, weaponDie))
  // Sneak Attack (m3-scope.html#ability-mechanics): "the first landed hit
  // each battle — and every crit — adds +Nd6." Rolled as its own d6s (not
  // the weapon's die) and folded into the same swing's total before scaling,
  // so it benefits from lengthFactor/speedBonus/gate like the rest of the hit.
  const isSneakAttack = sneakAttackDice > 0 && (forceSneakAttack || isCrit)
  const sneakDiceRolled = isSneakAttack
    ? Array.from({ length: sneakAttackDice }, () => rollDie(rng, 6))
    : []
  const diceRolled = [...weaponDiceRolled, ...sneakDiceRolled]
  const diceTotal = diceRolled.reduce((sum, roll) => sum + roll, 0)
  const baseHit = (diceTotal + weaponAbilityMod) * damageScale * (isCrit ? critDamageMult : 1)

  return {
    damage: baseHit * lf * sb * powerUpMultiplier * gatePenalty * fumbleDamageMultiplier,
    isCrit,
    lengthFactor: lf,
    speedBonus: sb,
    diceRolled,
    isSneakAttack,
  }
}

export interface ComputeMonsterDamageParams {
  charCount: number
  timeUsedMs: number
  timeLimitMs: number
  combat: CombatConfig
}

// The monster's damage uses the same shape minus Luck (crit) and power-ups —
// both player-only — so difficulty is tuned by monster stats, not a second
// rulebook. See game-design.html#damage.
export const computeMonsterDamage = (params: ComputeMonsterDamageParams): number => {
  const { charCount, timeUsedMs, timeLimitMs, combat } = params
  return combat.baseDamage * lengthFactor(charCount, combat) * speedBonus(timeUsedMs, timeLimitMs)
}
