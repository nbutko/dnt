// The Story 13 "lock it in" half — mirrors engine/sim/dungeon-invariants.ts's
// habit (a sweep function returning a flat list of violations, asserted
// empty by a `.test.ts`) for the M3 combat pipeline instead of dungeon
// generation. Three checks, each picked to fail loudly if a future edit to
// config/abilities.ts / config/leveling.ts reopens a gap Story 13 closed:
//
//   1. Hits-to-kill stays in a healthy multi-prompt band, and no fight is
//      unwinnable for a tier-matched baseline typist — simulateCharacterBattles
//      (Monte Carlo, a modest battle count so the sweep stays fast).
//   2. Monotonicity: leveling up, a bigger die, or a higher ability score is
//      never *strictly worse*. Checked via the closed-form expected-hit-
//      damage formula below (exact, not sampled) so dozens of comparisons run
//      in milliseconds with zero flakiness.
//   3. A higher dungeon tier is never easier for a FIXED hero (gear/level
//      held constant) — Monte Carlo, three widely-spaced tier milestones.
//      Adjacent tiers are deliberately NOT compared: content/monsters.json's
//      per-tier boss HP isn't itself strictly increasing tier-over-tier (e.g.
//      tier 2's Displacer Beast at 97 HP is softer than tier 1's Goblin Boss
//      at 150 — a real, frozen roster quirk from m2-implementation.html's
//      "widened tier 1 to cover the grandfathered M0 roster" call, not a
//      Story 13 bug), so a strict pairwise-adjacent assertion would fail on
//      real, out-of-scope content rather than on anything this story tunes.
//      Three far-apart milestones (1, 6, 11) is the coarse-but-robust form
//      that actually holds and still catches a real regression.

import abilitiesConfig from '../../config/abilities'
import { getClass } from '../../config/classes'
import combat from '../../config/combat'
import { getWeapon, WEAPONS } from '../../config/weapons'
import type { Ability, AbilityScores, Character, CharacterClass } from '../../domain/character'
import type { PlayerModifiers } from '../../domain/progression'
import type { Monster } from '../../domain/types'
import { DEFAULT_MODIFIERS_CONFIG, resolveModifiers } from '../character/modifiers'
import {
  bossOf,
  cheapestRegularOf,
  representativeAbilities,
  simulateCharacterBattles,
  textTierRangeForTier,
  weaponForTierLevel,
  wpmForTier,
  type SimulatedCharacter,
} from './balance'

export interface InvariantViolation {
  check: string
  detail: string
}

// A little float slack for the closed-form comparisons — two builds that are
// truly equal in expected damage can differ by a rounding hair, which isn't a
// "strictly worse" regression.
const EPSILON = 1e-6

export const CLASSES: readonly CharacterClass[] = ['fighter', 'wizard', 'rogue', 'bard']

// --- Check 1: hits-to-kill band + winnability -------------------------------

// Generous — not pinned to a single number, matching balance.test.ts's Story 7
// precedent — but tight enough to catch a real one-shot (<1.2, most of a
// fight's damage landing in a single swing) or a real grind (>26 hits, well
// past every sampled tier's observed band; see balance.test.ts's report).
const HITS_TO_KILL_BAND: readonly [number, number] = [1.2, 26]
// Below this, a "baseline" typist is losing more often than not — not the
// "winnable but tense" the scope asks for.
const MIN_WIN_RATE = 0.15

// The ladder's 5 milestone (tier, level) samples the metrics table
// (balance.test.ts) and this sweep both read off of — spread roughly
// level ~= tier * 20/11 across the whole ladder + level cap. There's no
// shipped "expected level per tier" table (XP pacing is an explicit M5
// question, m3-scope.html#open), so this is Story 13's own stand-in for "a
// hero who has been playing roughly this long," not a claim about the real
// pacing.
export const TIER_LEVEL_SAMPLES: readonly { tier: number; level: number }[] = [
  { tier: 1, level: 1 },
  { tier: 3, level: 5 },
  { tier: 6, level: 10 },
  { tier: 9, level: 15 },
  { tier: 11, level: 20 },
]

export const sweepHitsToKillBand = (battles = 120, seed = 900): InvariantViolation[] => {
  const violations: InvariantViolation[] = []
  const [minHits, maxHits] = HITS_TO_KILL_BAND

  for (const { tier, level } of TIER_LEVEL_SAMPLES) {
    const wpm = wpmForTier(tier)
    const textTierRange = textTierRangeForTier(tier)
    for (const characterClass of CLASSES) {
      // The regular fight at the sample level; the boss gets +4 levels — a
      // dungeon's boss sits behind its regular fights on the shortest path
      // (m2-scope.html), so a hero reaching it has already leveled up some
      // from clearing the way there, not still standing at the tier's entry
      // level (a level-1 character vs. a tier's own boss is a real, by-design
      // mismatch — see balance.test.ts's Story 13 report for the worked
      // case this modeling choice exists to fix).
      const encounters: { monster: Monster; level: number }[] = [
        { monster: cheapestRegularOf(tier), level },
        { monster: bossOf(tier), level: level + 4 },
      ]
      for (const { monster, level: fightLevel } of encounters) {
        const weapon = weaponForTierLevel(characterClass, fightLevel)
        const character: SimulatedCharacter = {
          class: characterClass,
          level: fightLevel,
          abilities: representativeAbilities(characterClass, fightLevel, weapon.ability),
          weapon,
          wpm,
          accuracy: 0.85,
        }
        const result = simulateCharacterBattles({ monster, combat, character, textTierRange, battles, seed })
        const label = `tier ${tier} lvl ${fightLevel} ${characterClass} vs ${monster.id}`

        if (result.hitsToKill < minHits) {
          violations.push({
            check: 'hits-to-kill-floor',
            detail: `${label}: ${result.hitsToKill.toFixed(2)} hits (one-shot risk, < ${minHits})`,
          })
        }
        if (result.hitsToKill > maxHits) {
          violations.push({
            check: 'hits-to-kill-ceiling',
            detail: `${label}: ${result.hitsToKill.toFixed(2)} hits (grind risk, > ${maxHits})`,
          })
        }
        if (result.winRate < MIN_WIN_RATE) {
          violations.push({
            check: 'winnable',
            detail: `${label}: winRate ${(result.winRate * 100).toFixed(0)}% (< ${MIN_WIN_RATE * 100}%)`,
          })
        }
      }
    }
  }
  return violations
}

// --- Check 2: monotonicity (closed-form, exact — no sampling noise) --------

// Expected damage of one "steady-state" swing — the same weapon-die +
// ability-mod + crit-dice-count formula engine/damage.ts's computeDamage
// rolls per swing, in expectation rather than sampled, so a monotonicity
// comparison is instant and exact. Deliberately ignores lengthFactor/
// speedBonus/tierGatePenalty/powerUpMult — those come from the FIGHT (prompt
// served, player speed, dungeon), not the character build under test, and
// multiply both sides of any single build-vs-build comparison equally, so
// they don't change whether one build is strictly worse than another.
export const expectedAverageHitDamage = (modifiers: PlayerModifiers, damageScale: number): number => {
  const dieAvg = (modifiers.weaponDie + 1) / 2
  const critChance = Math.min(Math.max(combat.criticalChance + modifiers.critChanceBonus, 0), 1)
  // Sneak Attack always rides a crit in steady state (engine/damage.ts:
  // isSneakAttack = forceSneakAttack || isCrit — forceSneakAttack only ever
  // fires once, on the fight's first hit, negligible over a multi-hit fight).
  const sneakAvg = modifiers.sneakAttackDice * 3.5
  const critDiceAvg = modifiers.arcaneCritMult * dieAvg + sneakAvg
  const diceTotalAvg = (1 - critChance) * dieAvg + critChance * critDiceAvg
  return (diceTotalAvg + modifiers.weaponAbilityMod) * damageScale
}

const ALL_TEN: AbilityScores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }

const fakeCharacter = (characterClass: CharacterClass, level: number, abilities: AbilityScores): Character => ({
  name: 'sweep',
  class: characterClass,
  level,
  xp: 0,
  abilities,
  pendingAsi: 0,
})

// Leveling never strictly worse: hold gear fixed at the class's own starting
// weapon (isolating what leveling itself grants — HP, proficiency, and ASI-
// driven ability growth — from gear upgrades, a separate axis checked below).
export const sweepLevelingMonotonicity = (): InvariantViolation[] => {
  const violations: InvariantViolation[] = []
  const levels = [1, 4, 5, 8, 10, 12, 15, 16, 19, 20]

  for (const characterClass of CLASSES) {
    const weapon = getWeapon(getClass(characterClass).startingWeapon)
    let prevDamage = -Infinity
    let prevHp = -Infinity
    let prevEncounterBonus = -Infinity

    for (const level of levels) {
      const abilities = representativeAbilities(characterClass, level, weapon.ability)
      const modifiers = resolveModifiers(fakeCharacter(characterClass, level, abilities), weapon, [], DEFAULT_MODIFIERS_CONFIG)
      const damage = expectedAverageHitDamage(modifiers, abilitiesConfig.damageScale)

      if (damage < prevDamage - EPSILON) {
        violations.push({
          check: 'level-up-damage',
          detail: `${characterClass} level ${level}: expected hit ${damage.toFixed(2)} < previous ${prevDamage.toFixed(2)}`,
        })
      }
      if (modifiers.maxHp < prevHp) {
        violations.push({
          check: 'level-up-hp',
          detail: `${characterClass} level ${level}: maxHp ${modifiers.maxHp} < previous ${prevHp}`,
        })
      }
      if (modifiers.encounterBonus < prevEncounterBonus) {
        violations.push({
          check: 'level-up-proficiency',
          detail: `${characterClass} level ${level}: encounterBonus ${modifiers.encounterBonus} < previous ${prevEncounterBonus}`,
        })
      }
      prevDamage = damage
      prevHp = modifiers.maxHp
      prevEncounterBonus = modifiers.encounterBonus
    }
  }
  return violations
}

// A bigger die is never strictly worse — every launch weapon's die size,
// holding ability mod/crit/sneak constant so only the die itself varies.
export const sweepWeaponDieMonotonicity = (): InvariantViolation[] => {
  const violations: InvariantViolation[] = []
  const baseline: PlayerModifiers = {
    maxHp: 40,
    maxHearts: 1,
    timeBudgetBonusMs: 0,
    encounterBonus: 2,
    hasAdvantage: false,
    critChanceBonus: 0,
    critDamageMult: 1,
    powerUpMult: 1,
    dodgeChance: 0,
    intimidateWpmCut: 0,
    charmAccuracyCut: 0,
    weaponDie: 4,
    weaponAbilityMod: 2,
    critRange: 20,
    guaranteedFirstCrit: false,
    fumbleImmune: false,
    sneakAttackDice: 0,
    secondWind: null,
    arcaneCritMult: 2,
  }
  const dieSizes = [...new Set(WEAPONS.map((weapon) => weapon.die))].sort((a, b) => a - b)

  let prevDamage = -Infinity
  for (const die of dieSizes) {
    const damage = expectedAverageHitDamage({ ...baseline, weaponDie: die }, abilitiesConfig.damageScale)
    if (damage < prevDamage - EPSILON) {
      violations.push({
        check: 'bigger-die',
        detail: `d${die}: expected hit ${damage.toFixed(2)} < previous die's ${prevDamage.toFixed(2)}`,
      })
    }
    prevDamage = damage
  }
  return violations
}

interface AbilityCheck {
  ability: Ability
  weapon: ReturnType<typeof getWeapon>
  level: number
  read: (modifiers: PlayerModifiers) => number
  label: string
}

// A higher ability score is never strictly worse, per the one derived number
// each ability primarily governs (m3-scope.html#abilities). The class
// feature bonuses layered on top (Arcane Mind's INT bonus, etc.) are a
// level/class-constant offset added to every sample alike, so they can't
// introduce a decrease — 'fighter' is used throughout without loss of
// generality.
const abilityChecks = (): AbilityCheck[] => [
  { ability: 'str', weapon: getWeapon('longsword'), level: 1, read: (m) => m.weaponAbilityMod, label: 'STR -> weaponAbilityMod' },
  { ability: 'dex', weapon: getWeapon('dagger'), level: 1, read: (m) => m.weaponAbilityMod, label: 'DEX -> weaponAbilityMod' },
  { ability: 'dex', weapon: getWeapon('dagger'), level: 1, read: (m) => m.critChanceBonus, label: 'DEX -> critChanceBonus' },
  { ability: 'dex', weapon: getWeapon('dagger'), level: 1, read: (m) => m.dodgeChance, label: 'DEX -> dodgeChance' },
  { ability: 'int', weapon: getWeapon('wand'), level: 1, read: (m) => m.weaponAbilityMod, label: 'INT -> weaponAbilityMod' },
  { ability: 'int', weapon: getWeapon('wand'), level: 1, read: (m) => m.encounterBonus, label: 'INT -> encounterBonus' },
  { ability: 'wis', weapon: getWeapon('wand'), level: 1, read: (m) => m.timeBudgetBonusMs, label: 'WIS -> timeBudgetBonusMs' },
  { ability: 'cha', weapon: getWeapon('rapier'), level: 1, read: (m) => m.intimidateWpmCut, label: 'CHA -> intimidateWpmCut' },
  { ability: 'cha', weapon: getWeapon('rapier'), level: 1, read: (m) => m.charmAccuracyCut, label: 'CHA -> charmAccuracyCut' },
  // CON only grants HP from level 2 on (level 1's HP is hit-die-only, per
  // engine/character/leveling.ts's grantsForLevel) — level 5 so it's visible.
  { ability: 'con', weapon: getWeapon('longsword'), level: 5, read: (m) => m.maxHp, label: 'CON -> maxHp' },
]

export const sweepAbilityMonotonicity = (): InvariantViolation[] => {
  const violations: InvariantViolation[] = []
  const scores = [8, 10, 12, 14, 16, 18, 20]

  for (const check of abilityChecks()) {
    let prevValue = -Infinity
    for (const score of scores) {
      const abilities: AbilityScores = { ...ALL_TEN, [check.ability]: score }
      const modifiers = resolveModifiers(
        fakeCharacter('fighter', check.level, abilities),
        check.weapon,
        [],
        DEFAULT_MODIFIERS_CONFIG,
      )
      const value = check.read(modifiers)
      if (value < prevValue - EPSILON) {
        violations.push({
          check: 'ability-monotonicity',
          detail: `${check.label} at score ${score}: ${value} < previous ${prevValue}`,
        })
      }
      prevValue = value
    }
  }
  return violations
}

// --- Check 3: a higher dungeon tier is never easier, for a FIXED hero ------

// Widely-spaced on purpose — see the file header's note on why adjacent
// tiers aren't compared. hitsToKill only (not winRate): winRate is a noisy,
// near-binary read this far from a build's "intended" tier (a level-10
// Fighter is wildly over- or under-leveled for tier 1 vs. tier 11 alike), so
// small, unrelated timing effects can flip it near 0%/100% either way even
// while the underlying damage-race genuinely gets harder — hitsToKill is the
// direct, load-bearing ratio (m3-scope.html#open) and stays a clean signal.
const TIER_DIFFICULTY_MILESTONES: readonly number[] = [1, 6, 11]

export const sweepTierMonotonicity = (battles = 150, seed = 777): InvariantViolation[] => {
  const violations: InvariantViolation[] = []
  const weapon = getWeapon('warhammer')
  const character: SimulatedCharacter = {
    class: 'fighter',
    level: 10,
    abilities: representativeAbilities('fighter', 10, weapon.ability),
    weapon,
    wpm: 40,
    accuracy: 0.85,
  }

  let prevHitsToKill = -Infinity
  for (const tier of TIER_DIFFICULTY_MILESTONES) {
    const boss = bossOf(tier)
    const result = simulateCharacterBattles({
      monster: boss,
      combat,
      character,
      textTierRange: textTierRangeForTier(tier),
      battles,
      seed,
    })
    if (result.hitsToKill < prevHitsToKill - EPSILON) {
      violations.push({
        check: 'tier-difficulty',
        detail:
          `tier ${tier} boss ${boss.id}: hitsToKill ${result.hitsToKill.toFixed(2)} < ` +
          `previous milestone's ${prevHitsToKill.toFixed(2)} (a fixed hero found a higher tier easier)`,
      })
    }
    prevHitsToKill = result.hitsToKill
  }
  return violations
}
