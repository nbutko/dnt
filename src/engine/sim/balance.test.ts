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
