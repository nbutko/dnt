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
import { ASI_LEVELS, EARLY_LEVEL_HP_BONUS, HP_SCALE, PROFICIENCY_BY_LEVEL, XP_THRESHOLDS } from '../../config/leveling'
import { abilityMod, type AbilityScores, type Character, type CharacterClass } from '../../domain/character'

// The knobs every function below reads, bundled so a caller (or a test) can
// swap in a different curve without this module importing config/leveling.ts
// implicitly in three different places. Defaults to the real Story 1 config,
// so ordinary callers (the reducer) never need to pass this at all.
export interface LevelingConfig {
  xpThresholds: readonly number[]
  asiLevels: readonly number[]
  proficiencyByLevel: readonly number[]
  hpScale: number
  // Story 4 (content-plan-v2-tuning-implementation.html): a tapering flat HP
  // bonus for levels 1-3, index 0 = level 1. Empty/short arrays are fine —
  // a level past the array's length just gets 0.
  earlyLevelHpBonus: readonly number[]
}

export const DEFAULT_LEVELING_CONFIG: LevelingConfig = {
  xpThresholds: XP_THRESHOLDS,
  asiLevels: ASI_LEVELS,
  proficiencyByLevel: PROFICIENCY_BY_LEVEL,
  hpScale: HP_SCALE,
  earlyLevelHpBonus: EARLY_LEVEL_HP_BONUS,
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

// The character sheet's "XP to Level N" bar (Story 5, ui/inn/CharacterSheet).
// Derives everything the bar shows from the raw XP total, so nothing about
// progress is stored on the Character. `fraction` is the current total over
// the NEXT level's threshold (matching the wireframe's own 3,600 / 6,500 =
// 55% reading), clamped to [0,1]; at the level cap there is no next threshold,
// so `isMax` is true and the bar reads full.
export interface XpProgress {
  level: number
  nextLevel: number | null
  nextThreshold: number | null
  fraction: number
  isMax: boolean
}

export const xpProgress = (xp: number, cfg: LevelingConfig = DEFAULT_LEVELING_CONFIG): XpProgress => {
  const level = levelForXp(xp, cfg)
  const isMax = level >= cfg.xpThresholds.length
  if (isMax) {
    return { level, nextLevel: null, nextThreshold: null, fraction: 1, isMax: true }
  }
  const nextThreshold = cfg.xpThresholds[level]
  const fraction = nextThreshold > 0 ? Math.min(Math.max(xp / nextThreshold, 0), 1) : 0
  return { level, nextLevel: level + 1, nextThreshold, fraction, isMax: false }
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

// Points a single ASI grants (5e's "+2 to one ability, or +1 to two" —
// m3-scope.html#leveling), reused for two things that have to agree: how many
// points state/save/save-reducer.ts's gainXp banks into pendingAsi per ASI
// level crossed, and the most applyAsi below will let one spend dispatch
// claim at once (so a character sitting on two unspent ASIs still spends them
// as two separate 2-point decisions, matching how 5e actually plays it).
export const ASI_POINTS_PER_LEVEL = 2

// The one place XP actually becomes a level-up. Adds `amount` to the
// character's XP, re-derives its level from the threshold table, and banks a
// full ASI grant (ASI_POINTS_PER_LEVEL) for every ASI level newly crossed — a
// multi-level jump (a boss/chest payout) can cross more than one at once, each
// its own grant. state/save/save-reducer.ts's `award` and `gainXp` are the
// only callers; centralizing it here is what makes every XP source level
// identically (the bug it fixes: `award`, the ONLY live XP path, used to bump
// xp without ever touching level or pendingAsi).
export const applyXpGain = (
  character: Character,
  amount: number,
  cfg: LevelingConfig = DEFAULT_LEVELING_CONFIG,
): Character => {
  const xp = character.xp + amount
  const oldLevel = levelForXp(character.xp, cfg)
  const level = levelForXp(xp, cfg)
  const asiLevelsCrossed = cfg.asiLevels.filter((asiLevel) => asiLevel > oldLevel && asiLevel <= level).length
  return { ...character, xp, level, pendingAsi: character.pendingAsi + asiLevelsCrossed * ASI_POINTS_PER_LEVEL }
}

// Idempotently re-derives a character's stored `level` from its XP total — the
// derive-don't-store rule applied on load (domain/save.ts's migrate), so a
// level frozen by an older bug (or shifted by an XP-curve retune) heals the
// next time the save is read, no version bump required.
export const reconcileLevel = (character: Character, cfg: LevelingConfig = DEFAULT_LEVELING_CONFIG): Character => {
  const level = levelForXp(character.xp, cfg)
  return level === character.level ? character : { ...character, level }
}

// Total ASI points a character has *earned* by reaching `level` — every ASI
// level at or below it grants ASI_POINTS_PER_LEVEL. Used once, by the v3->v4
// save migration, to bank the points the old dead plumbing never granted;
// because pendingAsi was unreachable before v4, nothing was ever spent, so
// earned == owed there.
export const earnedAsiPoints = (level: number, cfg: LevelingConfig = DEFAULT_LEVELING_CONFIG): number =>
  cfg.asiLevels.filter((asiLevel) => asiLevel <= level).length * ASI_POINTS_PER_LEVEL

// Validates the spend is <= ASI_POINTS_PER_LEVEL total and returns a NEW
// ability-scores object; never mutates the one it's given. Throws on an
// over-spend rather than silently clamping, matching config/classes.ts's
// getClass() precedent for invalid input in this codebase.
export const applyAsi = (abilities: AbilityScores, spend: Partial<AbilityScores>): AbilityScores => {
  const entries = Object.entries(spend) as [keyof AbilityScores, number | undefined][]
  const totalSpent = entries.reduce((sum, [, delta]) => sum + (delta ?? 0), 0)

  if (totalSpent > ASI_POINTS_PER_LEVEL) {
    throw new Error(`applyAsi: spend totals ${totalSpent}, but an ASI only grants ${ASI_POINTS_PER_LEVEL} points`)
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
