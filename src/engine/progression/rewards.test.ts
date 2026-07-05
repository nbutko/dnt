import { describe, expect, it } from 'vitest'
import rewardsConfig from '../../config/rewards'
import { rewardForChest, rewardForKill } from './rewards'

describe('reward math', () => {
  it('pays the tier-1 base with no growth applied', () => {
    expect(rewardForKill(1, 'regular', rewardsConfig)).toEqual({ xp: 8, coins: 5 })
    expect(rewardForKill(1, 'boss', rewardsConfig)).toEqual({ xp: 40, coins: 30 })
    expect(rewardForChest(1, rewardsConfig)).toEqual({ xp: 30, coins: 24 })
  })

  it('grows a base by tierGrowth per tier above 1', () => {
    // tier 3 → factor 1 + 2*0.35 = 1.7; regular xp 8*1.7 = 13.6 → 14.
    expect(rewardForKill(3, 'regular', rewardsConfig)).toEqual({ xp: 14, coins: 9 })
    // tier 11 boss → factor 1 + 10*0.35 = 4.5; xp 40*4.5 = 180.
    expect(rewardForKill(11, 'boss', rewardsConfig)).toEqual({ xp: 180, coins: 135 })
  })

  it('ranks roles: mimic beats a regular, a boss beats both, at every tier', () => {
    for (let tier = 1; tier <= 11; tier += 1) {
      const regular = rewardForKill(tier, 'regular', rewardsConfig)
      const mimic = rewardForKill(tier, 'mimic', rewardsConfig)
      const boss = rewardForKill(tier, 'boss', rewardsConfig)
      expect(mimic.xp, `tier ${tier}`).toBeGreaterThan(regular.xp)
      expect(boss.xp, `tier ${tier}`).toBeGreaterThan(mimic.xp)
    }
  })

  it('earns enough across a first tier-1 clear to afford an early skill node', () => {
    // A minimal tier-1 clear: shortest path is ~8 regular fights + the boss.
    // Even that floor should clear the 50-XP first Endurance node.
    const path = 8 * rewardForKill(1, 'regular', rewardsConfig).xp
    const boss = rewardForKill(1, 'boss', rewardsConfig).xp
    expect(path + boss).toBeGreaterThanOrEqual(50)
  })
})
