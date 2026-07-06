import type { CombatConfig, DamageResult, Rng, TextTier } from '../domain/types'
import { rollDie } from './rng'

// Longer prompts hit harder — the direct payoff for the skill tree unlocking
// longer text. Clamped to a floor so a short prompt can't drive damage to ~0.
export const lengthFactor = (charCount: number, combat: CombatConfig): number => {
  const raw = 1 + (charCount - combat.referenceLength) / combat.referenceLength
  return Math.max(combat.lengthFactorFloor, raw)
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
  // — never crits, regardless of criticalChance. Not wired to a caller yet
  // (that's Story 12's EncounterRoll plumbing); a param today so the rule
  // has somewhere to land.
  noCrits?: boolean
}

// Whether one swing crits. combat.criticalChance stays the per-hit trigger
// (Story 7 only retires the flat criticalDamageMultiplier for the player,
// rolling extra dice instead — see computeDamage below).
export const rollIsCrit = (combat: CombatConfig, rng: Rng, options: CritRuleOptions = {}): boolean => {
  const { forceCrit = false, noCrits = false } = options
  if (noCrits) return false
  if (forceCrit) return true
  return rng.next() < combat.criticalChance
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
  // A fumble also caps damage at this flat multiplier (m3-scope.html#open:
  // "the fumble/inspiration magnitudes") — 1 (no cap) outside a fumble.
  fumbleDamageMultiplier?: number
}

// Base hit = (sum of `critCount` weapon-die rolls on a crit, else 1 roll,
// + weaponAbilityMod) x damageScale — replacing the old flat baseDamage x
// criticalDamageMultiplier (m3-implementation.html Story 7, game-design.html
// #damage). Rolling extra dice on a crit is the D&D-correct reading of "a
// crit rolls the die twice" (thrice for arcane): roll `critCount` dice and
// sum them, rather than rolling once and doubling the result.
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
    fumbleDamageMultiplier = 1,
  } = params
  const lf = lengthFactor(charCount, combat)
  const sb = speedBonus(timeUsedMs, timeLimitMs)
  const isCrit = rollIsCrit(combat, rng, { forceCrit, noCrits })
  const rollCount = isCrit ? critCount : 1
  const diceRolled = Array.from({ length: rollCount }, () => rollDie(rng, weaponDie))
  const diceTotal = diceRolled.reduce((sum, roll) => sum + roll, 0)
  const baseHit = (diceTotal + weaponAbilityMod) * damageScale

  return {
    damage: baseHit * lf * sb * powerUpMultiplier * gatePenalty * fumbleDamageMultiplier,
    isCrit,
    lengthFactor: lf,
    speedBonus: sb,
    diceRolled,
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
