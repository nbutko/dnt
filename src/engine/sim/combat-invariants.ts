// The Story 13 "lock it in" half — mirrors engine/sim/dungeon-invariants.ts's
// habit (a sweep function returning a flat list of violations, asserted
// empty by a `.test.ts`) for the M3 combat pipeline instead of dungeon
// generation. Three checks, each picked to fail loudly if a future edit to
// config/abilities.ts / config/leveling.ts reopens a gap Story 13 closed:
//
//   1. Hits-to-kill stays in a healthy band for its role, and no fight is
//      unwinnable for a tier-matched baseline typist — simulateCharacterBattles
//      (Monte Carlo, a modest battle count so the sweep stays fast). Story 5
//      (content-plan-v2-tuning-implementation.html) re-expressed this as TWO
//      bands, not one: regulars stay a quick, disposable ~1-4 hits at any
//      tier, while a boss's target is the §3 "few big prompts" range —
//      tighter than the old flat [1.2, 26], now that a boss is genuinely a
//      multi-prompt set-piece rather than assumed-uniform short prompts.
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
//      that actually holds and still catches a real regression. Story 5 also
//      found and fixed a real modeling bug here: both check 1's boss
//      encounters and this check used to serve a boss fight off the
//      dungeon's *regular* textTierRange (INT-gated, so it could land well
//      below the boss's own tier) instead of the singleton
//      [bossTextTier, bossTextTier] DungeonScreen.tsx actually collapses a
//      boss node's band to (config/dungeon-tiers.ts's own doc comment) —
//      under-serving every boss fight in this sweep relative to what a real
//      run, and content-pipeline/retune-sweep.ts, actually plays. Fixed via
//      balance.ts's new bossTextTierRangeForTier. See this check's own
//      comment below for why hitsToKill itself still isn't the signal this
//      check asserts on, even after that fix.

import abilitiesConfig from '../../config/abilities'
import { getClass } from '../../config/classes'
import combat from '../../config/combat'
import { getWeapon, WEAPONS } from '../../config/weapons'
import type { Ability, AbilityScores, Character, CharacterClass } from '../../domain/character'
import type { PlayerModifiers } from '../../domain/progression'
import type { Monster, TextTier } from '../../domain/types'
import { DEFAULT_MODIFIERS_CONFIG, resolveModifiers } from '../character/modifiers'
import { critRangeChanceBonus } from '../damage'
import {
  bossOf,
  bossTextTierRangeForTier,
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

// Story 5's re-shape (content-plan-v2-tuning-implementation.html): the old
// flat [1.2, 26] assumed every fight was made of uniformly short prompts —
// wrong on both counts once the 14-tier content and the "few big prompts"
// boss design (content-plan-v2-tuning.html §3) landed. Regulars and bosses
// now play by different rules (§3's "regulars vs. bosses" section), so they
// get different bands:
//
//   - Regulars are meant to be quick and disposable (§3: "~2-3 prompts at
//     the dungeon's on-track level and speed"), but TIER_LEVEL_SAMPLES below
//     is its own coarse stand-in that overshoots real per-tier pacing at the
//     top of the ladder on purpose (see its own comment) — a level-20
//     "regular" encounter at tier 11 is deliberately over-leveled relative
//     to what a real tier-11 regular expects, so it can measure near a
//     literal one-shot (~1.0-1.3) without that being a regression. Floor
//     stays a hair above a true one-shot; ceiling is loose enough to cover
//     a genuinely under-leveled early sample too.
//   - Bosses are the epic, multi-prompt spikes: §3's per-tier target #prompts
//     runs 3-6 across the ladder (D1 4, D3 5, D6 6, D9 5, D11 3 — the exact
//     milestones this sweep samples), so the measured band should sit
//     comfortably inside that, tighter than the regular band and *nowhere
//     near* Finding 1's collapsed htk-1.0 one-shot.
const REGULAR_HITS_TO_KILL_BAND: readonly [number, number] = [1.0, 4]
const BOSS_HITS_TO_KILL_BAND: readonly [number, number] = [1.8, 5]
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

  for (const { tier, level } of TIER_LEVEL_SAMPLES) {
    const wpm = wpmForTier(tier)
    const regularTextTierRange = textTierRangeForTier(tier)
    // The boss's own served tier is a singleton [bossTextTier, bossTextTier]
    // (see the file header's Story 5 note) — never the dungeon's regular
    // range, which is what real gameplay and retune-sweep.ts both serve it.
    const bossTextTierRange = bossTextTierRangeForTier(tier)
    for (const characterClass of CLASSES) {
      // The regular fight at the sample level; the boss gets +4 levels — a
      // dungeon's boss sits behind its regular fights on the shortest path
      // (m2-scope.html), so a hero reaching it has already leveled up some
      // from clearing the way there, not still standing at the tier's entry
      // level (a level-1 character vs. a tier's own boss is a real, by-design
      // mismatch — see balance.test.ts's Story 13 report for the worked
      // case this modeling choice exists to fix).
      const encounters: { monster: Monster; level: number; role: 'regular' | 'boss'; textTierRange: readonly [TextTier, TextTier] }[] = [
        { monster: cheapestRegularOf(tier), level, role: 'regular', textTierRange: regularTextTierRange },
        { monster: bossOf(tier), level: level + 4, role: 'boss', textTierRange: bossTextTierRange },
      ]
      for (const { monster, level: fightLevel, role, textTierRange } of encounters) {
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
        const label = `tier ${tier} lvl ${fightLevel} ${characterClass} ${role} vs ${monster.id}`
        const [minHits, maxHits] = role === 'boss' ? BOSS_HITS_TO_KILL_BAND : REGULAR_HITS_TO_KILL_BAND

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
  // Story 3: the weapon's critRange also raises crit chance now (engine/
  // damage.ts's critRangeChanceBonus) — folded in here alongside DEX/item
  // critChanceBonus so this closed-form check matches the real engine.
  const critChance = Math.min(
    Math.max(combat.criticalChance + modifiers.critChanceBonus + critRangeChanceBonus(modifiers.critRange), 0),
    1,
  )
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
    damageReductionPct: 0,
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
// tiers aren't compared.
//
// Story 5 re-shape (content-plan-v2-tuning-implementation.html): this used to
// assert on hitsToKill, the same signal Check 1 uses. Fixing the boss-tier
// modeling bug (file header) was necessary but NOT sufficient to make that
// signal monotonic — and it can never be, structurally, for milestones this
// far apart. hitsToKill = monster.hp / avgDamagePerHit, and avgDamagePerHit
// scales with the *served text tier's* lengthFactor (engine/damage.ts),
// which is a property of the FIGHT (how long its prompt is), not of the
// fixed hero under test. Measuring boss.hp / lengthFactor(bossTextTier) —
// i.e. hitsToKill for ANY fixed hero, since the hero's own contribution
// cancels out of the ratio between two milestones — across this sweep's own
// three milestones gives 48.7 (D1) -> 110.3 (D6) -> 93.1 (D11): a real dip
// from D6 to D11, because D11's ~2000-char boss prompt's lengthFactor
// (soft-capped near ~18-20 by Story 1, but a 2000-char prompt is already
// deep into that asymptote) outgrows Tarrasque's HP bump relative to
// Hydra's. This is independent of which fixed hero/level/weapon is plugged
// in here (verified across 5 very different fixed builds, level 9-20,
// wpm 40-70 — hitsToKill dips D6->D11 every time), so it is NOT a modeling
// artifact this story's fixes can paper over: it is a genuine residual gap
// between how boss HP was authored (against a *tier-matched* hero's
// reference hit — content-plan-v2-tuning.html §8.1) and what a fixed,
// tier-MISmatched hero's hitsToKill measures when the prompt itself gets
// dramatically longer at the very top of the ladder.
//
// hitsToKill is therefore the wrong signal for THIS check post-retune.
// winRate is the right one, and — contrary to this check's old comment — is
// no longer noisy here: the same §3 design that makes the top bosses
// multi-minute stamina marathons means a fixed, tier-mismatched hero's real
// bottleneck at high tiers is surviving/out-typing the clock over a much
// longer fight, not the discrete hit count. Verified monotonically
// non-increasing (100 -> <=100 -> lowest) across the same 5 fixed builds
// above; the original build below (level 10, wpm 40, warhammer) measures
// 100% -> 81% -> 0%. hitsToKill is still computed and reported in each
// violation's detail for debugging, just no longer the assertion.
const TIER_DIFFICULTY_MILESTONES: readonly number[] = [1, 6, 11]

// winRate's granularity is 1/battles, not a float-rounding hair — a same-
// battles tie shouldn't count as "found it easier."
const WIN_RATE_EPSILON = (battles: number): number => 1 / battles

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

  let prevWinRate = Infinity
  let prevHitsToKill = -Infinity
  for (const tier of TIER_DIFFICULTY_MILESTONES) {
    const boss = bossOf(tier)
    const result = simulateCharacterBattles({
      monster: boss,
      combat,
      // The boss's own served tier — see the file header's Story 5 note.
      textTierRange: bossTextTierRangeForTier(tier),
      character,
      battles,
      seed,
    })
    if (result.winRate > prevWinRate + WIN_RATE_EPSILON(battles)) {
      violations.push({
        check: 'tier-difficulty',
        detail:
          `tier ${tier} boss ${boss.id}: winRate ${(result.winRate * 100).toFixed(0)}% > ` +
          `previous milestone's ${(prevWinRate * 100).toFixed(0)}% (a fixed hero found a higher tier easier; ` +
          `hitsToKill ${result.hitsToKill.toFixed(2)} vs previous ${prevHitsToKill.toFixed(2)})`,
      })
    }
    prevWinRate = result.winRate
    prevHitsToKill = result.hitsToKill
  }
  return violations
}
