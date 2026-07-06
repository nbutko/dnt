// D&D progression as pure functions (m3-scope.html#leveling) — turns a
// character's XP total and class into the three automatic level-up grants
// (HP, proficiency, class features) plus the one discretionary one (ASI
// points). Seeded entirely off Story 1's config/leveling.ts + config/
// classes.ts; nothing here reads or writes a Character directly, and nothing
// here is React. The save reducer (state/save/save-reducer.ts) is the only
// caller that turns these pure results into a state transition.
//
// HP and proficiency bonus are computed here but never stored on a Character
// (see domain/character.ts) — Story 3's resolveModifiers() calls
// grantsForLevel() at read time instead, so they can never drift from the
// abilities/level that produce them.

import { getClass, type ClassFeature } from '../../config/classes'
import { ASI_LEVELS, HP_SCALE, PROFICIENCY_BY_LEVEL, XP_THRESHOLDS } from '../../config/leveling'
import { abilityMod, type AbilityScores, type CharacterClass } from '../../domain/character'

// The knobs every function below reads, bundled so a caller (or a test) can
// swap in a different curve without this module importing config/leveling.ts
// implicitly in three different places. Defaults to the real Story 1 config,
// so ordinary callers (the reducer) never need to pass this at all.
export interface LevelingConfig {
  xpThresholds: readonly number[]
  asiLevels: readonly number[]
  proficiencyByLevel: readonly number[]
  hpScale: number
}

export const DEFAULT_LEVELING_CONFIG: LevelingConfig = {
  xpThresholds: XP_THRESHOLDS,
  asiLevels: ASI_LEVELS,
  proficiencyByLevel: PROFICIENCY_BY_LEVEL,
  hpScale: HP_SCALE,
}

const clampLevel = (level: number, length: number): number => Math.min(Math.max(level, 1), length)

// Which level threshold an XP total currently sits at — the highest level
// whose threshold is <= xp. Thresholds are monotonic (Story 1 schema test),
// so a simple scan is enough; index 0 (0 XP) always qualifies for level 1.
export const levelForXp = (xp: number, cfg: LevelingConfig = DEFAULT_LEVELING_CONFIG): number => {
  let level = 1
  cfg.xpThresholds.forEach((threshold, index) => {
    if (xp >= threshold) {
      level = index + 1
    }
  })
  return level
}

export interface LevelGrant {
  // HP added *at this level* (not cumulative) — level 1 is the full hit die
  // scaled (config/leveling.ts's exact call: a d10 Fighter's 10 * 4 = 40, a
  // d6 Wizard's 6 * 4 = 24); every level after adds the class hit die's
  // average roll (rounded up, the 5e-standard (die + 1) / 2) plus the CON
  // modifier, both scaled the same way.
  hpAdded: number
  proficiencyBonus: number
  grantsAsi: boolean
  featuresUnlocked: ClassFeature[]
}

// HP added, proficiency bonus, whether this level grants an ASI, and which
// class features unlock — everything a level-up hands out for one specific
// level. Story 1's ClassDef carries a single static feature per class (no
// per-level scaling yet — that growth, e.g. a bigger Sneak Attack, is a
// Story 13/M5 job), so "unlocks" here just means level 1, when the class's
// one feature first turns on.
export const grantsForLevel = (
  characterClass: CharacterClass,
  level: number,
  con: number,
  cfg: LevelingConfig = DEFAULT_LEVELING_CONFIG,
): LevelGrant => {
  const classDef = getClass(characterClass)
  const conMod = abilityMod(con)

  const hpAdded =
    level <= 1
      ? classDef.hitDie * cfg.hpScale
      : Math.ceil((classDef.hitDie + 1) / 2) * cfg.hpScale + conMod * cfg.hpScale

  const proficiencyBonus = cfg.proficiencyByLevel[clampLevel(level, cfg.proficiencyByLevel.length) - 1]
  const grantsAsi = cfg.asiLevels.includes(level)
  const featuresUnlocked = level === 1 ? [classDef.feature] : []

  return { hpAdded, proficiencyBonus, grantsAsi, featuresUnlocked }
}

const MAX_ASI_SPEND = 2

// Validates the spend is <= 2 points total (5e's "+2 to one, or +1 to two"
// ASI rule — m3-scope.html#leveling) and returns a NEW ability-scores object;
// never mutates the one it's given. Throws on an over-spend rather than
// silently clamping, matching config/classes.ts's getClass() precedent for
// invalid input in this codebase.
export const applyAsi = (abilities: AbilityScores, spend: Partial<AbilityScores>): AbilityScores => {
  const entries = Object.entries(spend) as [keyof AbilityScores, number | undefined][]
  const totalSpent = entries.reduce((sum, [, delta]) => sum + (delta ?? 0), 0)

  if (totalSpent > MAX_ASI_SPEND) {
    throw new Error(`applyAsi: spend totals ${totalSpent}, but an ASI only grants ${MAX_ASI_SPEND} points`)
  }
  if (entries.some(([, delta]) => (delta ?? 0) < 0)) {
    throw new Error('applyAsi: spend cannot contain a negative delta')
  }

  const next = { ...abilities }
  for (const [ability, delta] of entries) {
    if (delta) next[ability] += delta
  }
  return next
}
