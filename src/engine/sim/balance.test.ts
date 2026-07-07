import { describe, expect, it } from 'vitest'
import abilitiesConfig from '../../config/abilities'
import combat from '../../config/combat'
import { ASI_LEVELS, HP_SCALE, PROFICIENCY_BY_LEVEL } from '../../config/leveling'
import { getMonster } from '../../content/monsters'
import { grantsForLevel } from '../character/leveling'
import { computeDamage } from '../damage'
import { DEFAULT_ENCOUNTER_ROLL_CONFIG, rollEncounter } from '../dice/encounter-roll'
import { createRng } from '../rng'
import { CLASSES, TIER_LEVEL_SAMPLES } from './combat-invariants'
import {
  bossOf,
  cheapestRegularOf,
  representativeAbilities,
  simulateBattles,
  simulateCharacterBattles,
  textTierRangeForTier,
  weaponForTierLevel,
  wpmForTier,
  type SimulatedCharacter,
} from './balance'

const REPRESENTATIVE_TIER_1_LINE = 'ask a lad a task'

describe('balance harness', () => {
  it('answers "what win rate does a 20wpm kid get vs the Slime, and how long does it take?"', () => {
    const result = simulateBattles({
      monster: getMonster('slime'),
      combat,
      player: { wpm: 20, accuracy: 0.9 },
      prompt: REPRESENTATIVE_TIER_1_LINE,
      battles: 200,
    })

    console.info(
      `20wpm vs Slime: winRate=${(result.winRate * 100).toFixed(0)}% ` +
        `medianDuration=${(result.medianDurationMs / 1000).toFixed(1)}s`,
    )

    expect(result.winRate).toBeGreaterThan(0)
    expect(result.winRate).toBeLessThanOrEqual(1)
    expect(result.medianDurationMs).toBeGreaterThan(0)
  })

  it('a faster, more accurate player wins at least as often as a slow, sloppy one', () => {
    const slime = getMonster('slime')
    const strong = simulateBattles({
      monster: slime,
      combat,
      player: { wpm: 40, accuracy: 0.95 },
      prompt: REPRESENTATIVE_TIER_1_LINE,
      battles: 200,
      seed: 10,
    })
    const weak = simulateBattles({
      monster: slime,
      combat,
      player: { wpm: 8, accuracy: 0.5 },
      prompt: REPRESENTATIVE_TIER_1_LINE,
      battles: 200,
      seed: 10,
    })

    expect(strong.winRate).toBeGreaterThanOrEqual(weak.winRate)
  })
})

// Story 7: baseDamage becomes a rolled weapon die + ability mod. This block
// re-runs the harness with a baseline character (a Fighter's starting
// longsword: d8, STR +2) and checks config/abilities.ts's damageScale keeps
// hits-to-kill in the same multi-prompt band the pre-Story-7 flat baseDamage
// produced (m3-scope.html#open's "HP-scale decision": Gray Ooze/slime ~2.5,
// climbing toward the Grassland boss's ~7 — measured pre- and post-dice by
// the same harness, see m3-implementation.html Story 7's report). Bands are
// generous (not pinned to a single number) since Story 13 owns the real tune.
describe('dice-era hits-to-kill (Story 7)', () => {
  const BASELINE_FIGHTER = { wpm: 20, accuracy: 0.9, weaponDie: 8, weaponAbilityMod: 2 }

  it.each([
    { id: 'slime', minHits: 1.5, maxHits: 4 },
    { id: 'goblin', minHits: 2, maxHits: 5 },
    { id: 'skeleton', minHits: 2.5, maxHits: 6 },
    { id: 'slime-king', minHits: 4.5, maxHits: 10 },
  ])('$id sits in its hits-to-kill band', ({ id, minHits, maxHits }) => {
    const result = simulateBattles({
      monster: getMonster(id),
      combat,
      player: BASELINE_FIGHTER,
      prompt: REPRESENTATIVE_TIER_1_LINE,
      battles: 300,
      seed: 5,
    })

    expect(result.hitsToKill).toBeGreaterThan(minHits)
    expect(result.hitsToKill).toBeLessThan(maxHits)
  })
})

// Story 13 (m3-implementation.html#story-13) — the "theory" half: cheap,
// exact checks that catch bugs the Monte-Carlo sim would hide (a formula
// error that still averages out plausible over a few hundred battles, say).
// Each one is independently re-derived from the docs/spec, not by calling the
// engine function under test, so it's a real cross-check, not a tautology.
describe('Story 13 — closed-form theory checks', () => {
  it('E[weapon die] = (sides + 1) / 2', () => {
    const rng = createRng(1)
    const N = 20000
    for (const sides of [4, 6, 8, 10, 12, 20]) {
      let total = 0
      for (let i = 0; i < N; i += 1) {
        total += Math.floor(rng.next() * sides) + 1
      }
      const observedAvg = total / N
      expect(observedAvg).toBeCloseTo((sides + 1) / 2, 1)
    }
  })

  it('expected baseline hit damage ≈ combat.baseDamage (10) — pins damageScale', () => {
    // A Fighter's starting longsword (d8, STR +2 — m3-scope.html#classes),
    // at reference length (lengthFactor 1) and a same-instant submit
    // (speedBonus 1), no crit — isolates (dieAvg + mod) * damageScale, the
    // exact quantity config/abilities.ts's damageScale comment calibrates.
    const rng = createRng(2)
    const N = 20000
    let total = 0
    for (let i = 0; i < N; i += 1) {
      const result = computeDamage({
        charCount: combat.referenceLength,
        timeUsedMs: 1000,
        timeLimitMs: 1000,
        combat,
        rng,
        weaponDie: 8,
        weaponAbilityMod: 2,
        damageScale: abilitiesConfig.damageScale,
        noCrits: true,
      })
      total += result.damage
    }
    const observedAvg = total / N
    // (4.5 + 2) * 1.6 = 10.4 — within a couple points of baseDamage's 10,
    // the "keeps the new dice near today's feel" bar the scope sets.
    expect(observedAvg).toBeGreaterThan(8)
    expect(observedAvg).toBeLessThan(12)
  })

  it('expected crit contribution matches combat.criticalChance and the ×N dice rule', () => {
    const rng = createRng(3)
    const N = 20000
    let crits = 0
    let critDiceTotal = 0
    let critCount = 0
    for (let i = 0; i < N; i += 1) {
      const result = computeDamage({
        charCount: combat.referenceLength,
        timeUsedMs: 1000,
        timeLimitMs: 1000,
        combat,
        rng,
        weaponDie: 6,
        weaponAbilityMod: 0,
        damageScale: 1,
        critCount: 2,
      })
      if (result.isCrit) {
        crits += 1
        critDiceTotal += result.diceRolled.reduce((sum, roll) => sum + roll, 0)
        critCount += 1
      }
    }
    // The observed crit rate should track combat.criticalChance (0.1).
    expect(crits / N).toBeCloseTo(combat.criticalChance, 1)
    // A crit rolls the d6 twice and sums — E[sum of 2d6] = 2 * 3.5 = 7.
    expect(critDiceTotal / critCount).toBeCloseTo(2 * 3.5, 0)
  })

  it('HP-per-level: a level-1 d10 Fighter lands near 40, a d6 Wizard a bit under (m3-scope.html#open)', () => {
    const fighterL1 = grantsForLevel('fighter', 1, 10)
    const wizardL1 = grantsForLevel('wizard', 1, 10)
    expect(fighterL1.hpAdded).toBe(10 * HP_SCALE) // 40
    expect(wizardL1.hpAdded).toBe(6 * HP_SCALE) // 24 — "a bit under" 40
    expect(wizardL1.hpAdded).toBeLessThan(fighterL1.hpAdded)
  })

  it('the proficiency ramp is monotonic and shifts the encounter d20 band distribution upward per level', () => {
    // The ramp itself never dips (the "+2...+6" climb the scope promises).
    for (let i = 1; i < PROFICIENCY_BY_LEVEL.length; i += 1) {
      expect(PROFICIENCY_BY_LEVEL[i]).toBeGreaterThanOrEqual(PROFICIENCY_BY_LEVEL[i - 1])
    }
    expect(ASI_LEVELS.length).toBeGreaterThan(0)

    // A level-1 bonus (+2) vs. a level-20 bonus (+6) should roll into the
    // 'high' band noticeably more often, holding everything else fixed —
    // "simply leveling up makes your dice land in tougher-but-stronger
    // prompt bands more often" (m3-scope.html#leveling).
    const highBandRate = (encounterBonus: number): number => {
      const rng = createRng(4)
      const N = 5000
      let highCount = 0
      for (let i = 0; i < N; i += 1) {
        const roll = rollEncounter(
          DEFAULT_ENCOUNTER_ROLL_CONFIG,
          { encounterBonus, hasAdvantage: false, fumbleImmune: false },
          rng,
        )
        if (roll.band === 'high') highCount += 1
      }
      return highCount / N
    }

    const lowLevelRate = highBandRate(PROFICIENCY_BY_LEVEL[0])
    const highLevelRate = highBandRate(PROFICIENCY_BY_LEVEL[PROFICIENCY_BY_LEVEL.length - 1])
    expect(highLevelRate).toBeGreaterThan(lowLevelRate)
  })
})

// Story 13's "metrics that define sane" — the whole M3 pipeline (encounter
// d20 -> served tier -> typed fight, Story 6/7/11/12's mechanics all live)
// run for a baseline typist as each of the 4 classes at 5 representative
// (dungeon tier, character level) milestones spanning the whole ladder. Not
// itself an invariant gate (combat-invariants.test.ts owns the pass/fail
// bar) — this test's job is to print the table a human can eyeball, per the
// story's "paste the key metric table" report requirement. A light sanity
// assertion keeps it from silently rotting into a no-op.
describe('Story 13 — the whole-pipeline metrics table', () => {
  it('reports win rate / duration / hits-to-kill per tier x class x level', () => {
    const rows: string[] = []
    for (const { tier, level } of TIER_LEVEL_SAMPLES) {
      const wpm = wpmForTier(tier)
      const textTierRange = textTierRangeForTier(tier)
      for (const characterClass of CLASSES) {
        // Regular fight at the sample level, boss fight 4 levels later (the
        // dungeon's own regular fights level the hero up before the boss —
        // see combat-invariants.ts's sweepHitsToKillBand doc comment).
        const encounters = [
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
          const result = simulateCharacterBattles({
            monster,
            combat,
            character,
            textTierRange,
            battles: 150,
            seed: 42,
          })

          expect(result.winRate).toBeGreaterThanOrEqual(0)
          expect(result.winRate).toBeLessThanOrEqual(1)
          expect(Number.isFinite(result.hitsToKill)).toBe(true)

          rows.push(
            `tier=${tier} lvl=${fightLevel} class=${characterClass} monster=${monster.id}(${monster.role},hp${monster.hp}) ` +
              `wpm=${wpm} winRate=${(result.winRate * 100).toFixed(0)}% ` +
              `medianDur=${(result.medianDurationMs / 1000).toFixed(1)}s hitsToKill=${result.hitsToKill.toFixed(2)} ` +
              `critRate=${(result.critRate * 100).toFixed(1)}% dodgeRate=${(result.dodgeRate * 100).toFixed(1)}%`,
          )
        }
      }
    }
    console.info(`\n${rows.join('\n')}\n`)
  })
})
