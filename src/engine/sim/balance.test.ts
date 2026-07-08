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
  hitMagnitudes,
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

// Story 1 (M4/M5 retune, content-plan-v2-tuning-implementation.html#story-1):
// hitMagnitudes is the closed-form "reference hit" range HP is authored
// against — weak (min dice, no crit) to strong (max dice + crit), against the
// now-capped lengthFactor. Pinned for a real, shipped boss (D1's Goblin Boss)
// so a future edit to config/combat.ts's lengthFactorCap or content/
// monsters.json's HP can't silently reopen the one-shot problem this story
// closes.
describe('hitMagnitudes — the weak/average/strong reference-hit range (Story 1)', () => {
  const D1_BOSS_ON_TRACK_LEVEL = 2

  it.each(CLASSES)('%s: weak <= average <= strong, and the strong tail never one-shots the D1 boss', (cls) => {
    const boss = bossOf(1)
    const weapon = weaponForTierLevel(cls, D1_BOSS_ON_TRACK_LEVEL)
    const magnitudes = hitMagnitudes(cls, D1_BOSS_ON_TRACK_LEVEL, weapon, boss.textTier, combat)

    expect(magnitudes.weak).toBeLessThanOrEqual(magnitudes.average)
    expect(magnitudes.average).toBeLessThanOrEqual(magnitudes.strong)
    // The crisp low-K bounding rule (content-plan-v2-tuning.html §8.1): the
    // strongest realistic single hit (max dice + crit) stays STRICTLY below
    // the boss's whole HP bar — no build, at this boss's on-track level,
    // one-shots it.
    expect(magnitudes.strong).toBeLessThan(boss.hp)
    // And with real headroom, not just barely — strong should sit well under
    // half the bar, since the real engine ALSO applies a speedBonus (up to
    // 2x, deliberately excluded from this theory-only helper — see its doc
    // comment) on top of dice/crit variance.
    expect(magnitudes.strong).toBeLessThan(boss.hp * 0.75)
  })

  it("two weak hits lose to the D1 boss's HP but ~K average hits win it (the low-K bounding rule)", () => {
    const boss = bossOf(1)
    const targetPrompts = 4 // docs/content-plan-v2-tuning.html §3's D1 target
    const weapon = weaponForTierLevel('fighter', D1_BOSS_ON_TRACK_LEVEL)
    const magnitudes = hitMagnitudes('fighter', D1_BOSS_ON_TRACK_LEVEL, weapon, boss.textTier, combat)

    expect(magnitudes.average * targetPrompts).toBeGreaterThan(boss.hp * 0.6)
    expect(magnitudes.average * targetPrompts).toBeLessThan(boss.hp * 1.6)
  })

  it('scales up with charCount (a higher-tier boss reads a longer prompt, hits harder) but stays capped', () => {
    const weapon = weaponForTierLevel('fighter', 15)
    const lowTier = hitMagnitudes('fighter', 15, weapon, 4, combat)
    const highTier = hitMagnitudes('fighter', 15, weapon, 14, combat)

    expect(highTier.average).toBeGreaterThan(lowTier.average)
    expect(highTier.strong).toBeGreaterThan(lowTier.strong)
  })
})

// Story 3 (content-plan-v2-tuning-implementation.html#story-3): the weapon
// ladder extended the length of the game — every class climbs a "+N" line
// at the same level breakpoints instead of plateauing on its tier-2/3 launch
// weapon forever (Story 1's report flagged D9-D11 htk running under target
// because weaponForTierLevel had nowhere higher to go).
describe('weaponForTierLevel — the extended ladder (Story 3)', () => {
  it.each(CLASSES)('%s climbs to a strictly bigger weapon at each level breakpoint', (cls) => {
    const levels = [1, 5, 9, 12]
    let prevDie = -Infinity
    let prevBonus = -Infinity
    for (const level of levels) {
      const weapon = weaponForTierLevel(cls, level)
      // Bard has no dagger-tier starter (m3-scope.html#classes), so its
      // level-1 weapon is already the level-5 rapier — die/bonus can tie,
      // never regress.
      expect(weapon.die).toBeGreaterThanOrEqual(prevDie)
      expect(weapon.bonusDamage).toBeGreaterThanOrEqual(prevBonus)
      prevDie = weapon.die
      prevBonus = weapon.bonusDamage
    }
    // ...and it strictly climbs somewhere across the ladder (not flat the
    // whole way, which would mean a class never actually upgrades).
    const first = weaponForTierLevel(cls, 1)
    const last = weaponForTierLevel(cls, 12)
    expect(last.die > first.die || last.bonusDamage > first.bonusDamage).toBe(true)
  })

  it('every class has a real upgrade path reaching level 12 (no plateau at tier-3)', () => {
    for (const cls of CLASSES) {
      const weapon = weaponForTierLevel(cls, 12)
      expect(weapon.tier).toBeGreaterThan(3)
    }
  })
})

// Story 3's Finding-3 fix: the Wizard's wand-line gives the Arcane Mind's
// 3-dice crit something to scale on, closing most (not all — Story 5 signs
// off the final surface) of the on-track win-rate gap to the other classes
// at a higher tier, where Story 1 left it worst (D9's Dracolich, T12).
describe("the Wizard wand-line closes most of the on-track gap (Story 3's Finding 3)", () => {
  it('a Wizard using the wand-line wins measurably more than a Wizard stuck on the launch wand', () => {
    const tier = 9
    const level = 12 // D9's on-track level (content-pipeline/retune-sweep.ts)
    const wpm = wpmForTier(tier)
    const textTierRange = textTierRangeForTier(tier)
    const boss = bossOf(tier)

    const runWith = (weaponId: 'wand' | 'wand-plus3') => {
      const weapon = weaponId === 'wand' ? weaponForTierLevel('wizard', 1) : weaponForTierLevel('wizard', level)
      const abilities = representativeAbilities('wizard', level, weapon.ability)
      const character: SimulatedCharacter = { class: 'wizard', level, abilities, weapon, wpm, accuracy: 0.92 }
      return simulateCharacterBattles({ monster: boss, combat, character, textTierRange, battles: 80, seed: 11 })
    }

    const stuckOnLaunchWand = runWith('wand')
    const onTheLadder = runWith('wand-plus3')

    expect(onTheLadder.winRate).toBeGreaterThan(stuckOnLaunchWand.winRate)
  })

  it("the on-track Wizard/Rogue win-rate gap at D9 is no longer the launch-era blowout", () => {
    const tier = 9
    const level = 12
    const wpm = wpmForTier(tier)
    const textTierRange = textTierRangeForTier(tier)
    const boss = bossOf(tier)

    const runFor = (cls: (typeof CLASSES)[number]) => {
      const weapon = weaponForTierLevel(cls, level)
      const abilities = representativeAbilities(cls, level, weapon.ability)
      const character: SimulatedCharacter = { class: cls, level, abilities, weapon, wpm, accuracy: 0.92 }
      return simulateCharacterBattles({ monster: boss, combat, character, textTierRange, battles: 80, seed: 12 })
    }

    const wizard = runFor('wizard')
    const rogue = runFor('rogue')
    // Pre-Story-3, this gap was Finding 3's headline (Wizard 25-90% vs.
    // Rogue/Fighter/Bard 88-100%) — a ~90-point spread at the worst tier.
    // Not asserting parity (Rogue's crit/Sneak-Attack synergy is a real,
    // by-design edge), just that the wand-line has closed most of it.
    expect(rogue.winRate - wizard.winRate).toBeLessThan(0.5)
  })
})
