import type { CombatConfig, DamageResult, Rng, TextTier } from '../domain/types'

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

export interface CritResult {
  multiplier: number
  isCrit: boolean
}

export const critMultiplier = (combat: CombatConfig, rng: Rng): CritResult => {
  const isCrit = rng.next() < combat.criticalChance
  return { multiplier: isCrit ? combat.criticalDamageMultiplier : 1, isCrit }
}

// Punishes fighting above your unlocked Wordsmith tier — the served prompt is
// already easier (shorter/simpler), but that alone is only a linear discount
// on damage, which speedBonus can offset. Squaring the tier ratio makes the
// loss outrun anything speed can buy back (m2-scope.html#wordsmith-gate):
// 1 at/above the monster's tier, 0.56 at 6/8, 0.25 at 4/8.
export const tierGatePenalty = (servedTier: TextTier, monsterTextTier: TextTier): number =>
  servedTier >= monsterTextTier ? 1 : (servedTier / monsterTextTier) ** 2

export interface ComputeDamageParams {
  charCount: number
  timeUsedMs: number
  timeLimitMs: number
  combat: CombatConfig
  rng: Rng
  powerUpMultiplier?: number
  tierGatePenalty?: number
}

export const computeDamage = (params: ComputeDamageParams): DamageResult => {
  const {
    charCount,
    timeUsedMs,
    timeLimitMs,
    combat,
    rng,
    powerUpMultiplier = 1,
    tierGatePenalty: gatePenalty = 1,
  } = params
  const lf = lengthFactor(charCount, combat)
  const sb = speedBonus(timeUsedMs, timeLimitMs)
  const { multiplier: cm, isCrit } = critMultiplier(combat, rng)

  return {
    damage: combat.baseDamage * lf * sb * cm * powerUpMultiplier * gatePenalty,
    isCrit,
    lengthFactor: lf,
    speedBonus: sb,
    critMultiplier: cm,
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
