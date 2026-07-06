// The seam (m3-implementation.html#seams, seam 1) — replaces engine/
// progression/skill-effects.ts. Turns a persistent Character + its equipped
// Weapon + the run's ephemeral ActiveBuffs into the one PlayerModifiers bag
// battle-store already knows how to consume. Pure; never imports state/ or
// ui/, and never mutates anything it's handed.

import type { AbilitiesConfig } from '../../config/abilities'
import abilitiesConfig from '../../config/abilities'
import { getClass } from '../../config/classes'
import { getItem } from '../../config/items'
import type { WeaponConfig } from '../../config/weapons'
import { abilityMod, type Character } from '../../domain/character'
import type { ActiveBuff } from '../../domain/items'
import type { PlayerModifiers } from '../../domain/progression'
import type { TextTier } from '../../domain/types'
import { DEFAULT_LEVELING_CONFIG, grantsForLevel, type LevelingConfig } from './leveling'

// The knobs resolveModifiers reads, bundled the same way Story 2's
// LevelingConfig is — so a test can swap in a different table without this
// module importing config/abilities.ts or config/leveling.ts implicitly in
// several different spots. Defaults to the real Story 1 config, so ordinary
// callers never pass this at all.
export interface ModifiersConfig {
  abilities: AbilitiesConfig
  leveling: LevelingConfig
}

export const DEFAULT_MODIFIERS_CONFIG: ModifiersConfig = {
  abilities: abilitiesConfig,
  leveling: DEFAULT_LEVELING_CONFIG,
}

// Hearts (the per-run lives) now come from level milestones instead of a
// purchased Endurance node (m3-scope.html#reshaping: "Max hearts now come
// from level milestones... instead of Endurance nodes"). No milestone table
// exists yet anywhere in Story 1's config, so this is a Story 3 placeholder
// — one extra heart every 5 levels, landing a level-1 character at today's
// baseline of 1. Story 13/M5 owns the real curve.
const BASE_MAX_HEARTS = 1
const HEART_MILESTONE_INTERVAL = 5

const heartsForLevel = (level: number): number =>
  BASE_MAX_HEARTS + Math.floor(level / HEART_MILESTONE_INTERVAL)

const clampTextTier = (tier: number): TextTier =>
  Math.min(Math.max(Math.round(tier), 1), 10) as TextTier

// Cumulative HP across every level from 1 up to `character.level`, each
// level's grant computed by Story 2's grantsForLevel so HP is derived at read
// time and can never drift from the abilities/level that produce it (the
// derive-don't-store rule — m3-implementation.html Story 2).
const totalHpForLevel = (character: Character, cfg: LevelingConfig): number => {
  let hp = 0
  for (let level = 1; level <= character.level; level += 1) {
    hp += grantsForLevel(character.class, level, character.abilities.con, cfg).hpAdded
  }
  return hp
}

// Folds one active buff's item effect into a mutable accumulator. Only
// battle-facing effects apply here — 'restore-hearts' is an instant action
// applied directly by the save/dungeon-run reducers when the item is
// consumed, so it never becomes (or needs to be read from) an ActiveBuff.
interface BuffAccumulator {
  maxHpBonusPct: number
  timeBudgetBonusMs: number
  encounterBonus: number
  hasAdvantage: boolean
  critChanceBonus: number
  critDamageMultBonus: number
  powerUpMultBonus: number
  intTierCapBonus: number
  fumbleImmune: boolean
}

const applyBuff = (acc: BuffAccumulator, buff: ActiveBuff): BuffAccumulator => {
  const { effect } = getItem(buff.itemId)
  switch (effect.key) {
    case 'restore-hearts':
      return acc
    case 'power-up':
      return { ...acc, powerUpMultBonus: acc.powerUpMultBonus + effect.powerUpMultBonus }
    case 'time-budget':
      return { ...acc, timeBudgetBonusMs: acc.timeBudgetBonusMs + effect.bonusMs }
    case 'encounter-advantage':
      return { ...acc, hasAdvantage: true }
    case 'encounter-bonus':
      return { ...acc, encounterBonus: acc.encounterBonus + effect.bonus }
    case 'crit-boost':
      return {
        ...acc,
        critChanceBonus: acc.critChanceBonus + effect.critChanceBonus,
        critDamageMultBonus: acc.critDamageMultBonus + effect.critDamageMultBonus,
      }
    case 'int-tier-cap-bonus':
      return { ...acc, intTierCapBonus: acc.intTierCapBonus + effect.tiers }
    case 'heroism':
      return { ...acc, maxHpBonusPct: acc.maxHpBonusPct + effect.bonusHpPct, fumbleImmune: true }
    default:
      return acc
  }
}

const EMPTY_BUFF_ACCUMULATOR: BuffAccumulator = {
  maxHpBonusPct: 0,
  timeBudgetBonusMs: 0,
  encounterBonus: 0,
  hasAdvantage: false,
  critChanceBonus: 0,
  critDamageMultBonus: 0,
  powerUpMultBonus: 0,
  intTierCapBonus: 0,
  fumbleImmune: false,
}

// The seam. `activeBuffs` defaults to empty so callers that only need
// persistent-character numbers (the map/Inn headers, which just read
// maxHearts) can call this with a character and weapon alone — the one
// caller that also has ephemeral run buffs to fold in is the dungeon's
// battle-launch, which already reads both the save and the run store.
export const resolveModifiers = (
  character: Character,
  // WeaponConfig (not the bare domain/weapons.ts Weapon) because the
  // greataxe's time-budget penalty — the one extra field config/weapons.ts
  // adds on top — is a battle-facing number this seam has to fold in.
  weapon: WeaponConfig,
  activeBuffs: ActiveBuff[] = [],
  cfg: ModifiersConfig = DEFAULT_MODIFIERS_CONFIG,
): PlayerModifiers => {
  const classDef = getClass(character.class)
  const { abilities } = character
  const buffs = activeBuffs.reduce(applyBuff, EMPTY_BUFF_ACCUMULATOR)

  const baseMaxHp = totalHpForLevel(character, cfg.leveling)
  const maxHp = Math.round(baseMaxHp * (1 + buffs.maxHpBonusPct))
  const maxHearts = heartsForLevel(character.level)

  const { feature } = classDef
  const intTierCapBonus = feature.kind === 'arcane-mind' ? feature.intTierCapBonus : 0
  const intTierCap = clampTextTier(
    cfg.abilities.baseIntTierCap +
      cfg.abilities.intTierCapStepPerMod * abilityMod(abilities.int) +
      intTierCapBonus +
      buffs.intTierCapBonus,
  )

  const timeBudgetBonusMs =
    cfg.abilities.wisTimeBudgetMsPerMod * abilityMod(abilities.wis) -
    weapon.timeBudgetPenaltyMs +
    buffs.timeBudgetBonusMs

  const { proficiencyBonus } = grantsForLevel(
    character.class,
    character.level,
    abilities.con,
    cfg.leveling,
  )
  const encounterBonus = proficiencyBonus + buffs.encounterBonus
  const hasAdvantage =
    (feature.kind === 'cunning' && feature.encounterAdvantage) || buffs.hasAdvantage

  const critChanceBonus =
    cfg.abilities.dexCritChancePctPerMod * abilityMod(abilities.dex) + buffs.critChanceBonus
  const critDamageMult = 1 + buffs.critDamageMultBonus
  const powerUpMult = 1 + buffs.powerUpMultBonus
  const dodgeChance = cfg.abilities.dexDodgeChancePctPerMod * abilityMod(abilities.dex)
  const intimidateWpmCut = cfg.abilities.chaIntimidateWpmCutPctPerMod * abilityMod(abilities.cha)

  const sneakAttackDice = feature.kind === 'cunning' ? feature.sneakAttackDice : 0
  const secondWind =
    feature.kind === 'second-wind'
      ? { hpThresholdPct: feature.hpThresholdPct, healPct: feature.healPct }
      : null
  // The standard D&D "roll the damage dice twice on a crit" (engine/damage.ts,
  // Story 7), bumped to 3 for the Wizard's Arcane Mind — m3-scope.html#classes.
  const arcaneCritMult = feature.kind === 'arcane-mind' ? feature.critDiceCount : 2

  return {
    maxHp,
    maxHearts,
    intTierCap,
    timeBudgetBonusMs,
    encounterBonus,
    hasAdvantage,
    critChanceBonus,
    critDamageMult,
    powerUpMult,
    dodgeChance,
    intimidateWpmCut,
    weaponDie: weapon.die,
    weaponAbilityMod: abilityMod(abilities[weapon.ability]),
    critRange: weapon.critRange,
    // No Story 1-3 input sets a guaranteed crit yet — the encounter d20's
    // nat-20 "INSPIRED" result (Story 6) folds it into the modifiers the
    // battle-launch caller hands to battle-store, not here.
    guaranteedFirstCrit: false,
    fumbleImmune: buffs.fumbleImmune,
    sneakAttackDice,
    secondWind,
    arcaneCritMult,
  }
}
