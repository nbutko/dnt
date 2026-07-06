import { describe, expect, it } from 'vitest'
import { ITEMS } from '../../config/items'
import rewardsConfig from '../../config/rewards'
import { WEAPONS } from '../../config/weapons'
import type { Rng } from '../../domain/types'
import { createRng } from '../rng'
import {
  rewardForBossGear,
  rewardForBossKill,
  rewardForChest,
  rewardForKill,
  rollChestLoot,
} from './rewards'

// A fixed-sequence fake, same shape as engine/dice/encounter-roll.test.ts's —
// lets a test dictate exactly which draws rollChestLoot/rewardForBossGear see.
const fakeRng = (values: number[]): Rng => {
  let i = 0
  return {
    next: () => {
      const value = values[i % values.length]
      i += 1
      return value
    },
    sample: (mean) => mean,
  }
}

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

  it('rewardForBossKill pays more than a plain rewardForKill boss reward, at every tier', () => {
    for (let tier = 1; tier <= 11; tier += 1) {
      const plain = rewardForKill(tier, 'boss', rewardsConfig)
      const boss = rewardForBossKill(tier, rewardsConfig)
      expect(boss.xp, `tier ${tier}`).toBeGreaterThan(plain.xp)
      expect(boss.coins, `tier ${tier}`).toBeGreaterThan(plain.coins)
    }
  })
})

describe('rollChestLoot', () => {
  it('is deterministic for the same seed', () => {
    const a = rollChestLoot(3, createRng(42), rewardsConfig)
    const b = rollChestLoot(3, createRng(42), rewardsConfig)
    expect(a).toEqual(b)
  })

  it('reaches every loot kind — coins low in the roll, weapon mid, consumable high', () => {
    // Weights are { coins: 0.4, weapon: 0.25, consumable: 0.35 }, total 1 —
    // roll*total lands in [0, 0.4) coins, [0.4, 0.65) weapon, [0.65, 1) consumable.
    expect(rollChestLoot(1, fakeRng([0.1, 0]), rewardsConfig).kind).toBe('coins')
    expect(rollChestLoot(1, fakeRng([0.5, 0]), rewardsConfig).kind).toBe('weapon')
    expect(rollChestLoot(1, fakeRng([0.9, 0]), rewardsConfig).kind).toBe('consumable')
  })

  it('a coins roll pays the same amount as rewardForChest', () => {
    const loot = rollChestLoot(4, fakeRng([0]), rewardsConfig)
    expect(loot).toEqual({ kind: 'coins', amount: rewardForChest(4, rewardsConfig) })
  })

  it('never drops gear/an item above the chest dungeon\'s own tier', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const loot = rollChestLoot(1, createRng(seed), rewardsConfig)
      if (loot.kind === 'weapon') {
        const weapon = WEAPONS.find((w) => w.id === loot.weaponId)!
        expect(weapon.tier, `seed ${seed}`).toBeLessThanOrEqual(1)
      }
      if (loot.kind === 'consumable') {
        const item = ITEMS.find((i) => i.id === loot.itemId)!
        expect(item.tier, `seed ${seed}`).toBeLessThanOrEqual(1)
      }
    }
  })
})

describe('rewardForBossGear', () => {
  it('always yields a weapon (guaranteed gear)', () => {
    for (let tier = 1; tier <= 11; tier += 1) {
      const weaponId = rewardForBossGear(tier, createRng(tier * 7))
      expect(WEAPONS.some((w) => w.id === weaponId)).toBe(true)
    }
  })

  it('never guarantees gear above the dungeon tier, and picks the toughest bracket available', () => {
    // Tier 1 only has tier-1 weapons in the launch table — the guaranteed
    // drop must be one of those, never a tier-2/3 weapon.
    for (let seed = 0; seed < 50; seed += 1) {
      const weaponId = rewardForBossGear(1, createRng(seed))
      const weapon = WEAPONS.find((w) => w.id === weaponId)!
      expect(weapon.tier).toBe(1)
    }
    // Tier 3+ unlocks the tier-3 weapons — the guaranteed drop should be
    // drawn from that top bracket, never a starter tier-1 dagger.
    for (let seed = 0; seed < 50; seed += 1) {
      const weaponId = rewardForBossGear(3, createRng(seed))
      const weapon = WEAPONS.find((w) => w.id === weaponId)!
      expect(weapon.tier).toBe(3)
    }
  })
})
