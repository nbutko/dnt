import { describe, expect, it } from 'vitest'
import combat from '../../config/combat'
import { getMonster } from '../../content/monsters'
import { simulateBattles } from './balance'

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
