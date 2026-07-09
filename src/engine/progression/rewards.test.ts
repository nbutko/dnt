import { describe, expect, it } from 'vitest'
import { ITEMS } from '../../config/items'
import { XP_THRESHOLDS } from '../../config/leveling'
import rewardsConfig from '../../config/rewards'
import { WEAPONS } from '../../config/weapons'
import type { Rng } from '../../domain/types'
import { createRng } from '../rng'
import {
  normalXpForDungeon,
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

describe('reward XP — the M5 curve-derived model', () => {
  it('a normal (medium) kill reads the tuned per-dungeon table and rises monotonically', () => {
    // The hand-tuned per-dungeon normal-kill XP (config/rewards.ts, tracking
    // the 5e curve at ~1.3 levels/dungeon). Pinned so a retune is a visible edit.
    const expected = [5, 15, 41, 97, 127, 167, 230, 249, 251, 260, 340]
    for (let dungeon = 1; dungeon <= 11; dungeon += 1) {
      expect(normalXpForDungeon(dungeon, rewardsConfig), `D${dungeon}`).toBe(expected[dungeon - 1])
      expect(rewardForKill(dungeon, 'regular', rewardsConfig).xp, `D${dungeon} regular`).toBe(expected[dungeon - 1])
    }
    for (let dungeon = 2; dungeon <= 11; dungeon += 1) {
      expect(
        normalXpForDungeon(dungeon, rewardsConfig),
        `D${dungeon} > D${dungeon - 1}`,
      ).toBeGreaterThan(normalXpForDungeon(dungeon - 1, rewardsConfig))
    }
  })

  it('~100 normal kills bridge a dungeon toward the next 5e target (~1.3 levels)', () => {
    // The design intent: ~100 normal kills raise a player about 1.3 levels on
    // the real 5e curve. D1 (100*5 = 500 XP) clears the level-2 threshold (300)
    // and reaches into level 3's band — a fresh character's first target.
    expect(normalXpForDungeon(1, rewardsConfig) * 100).toBeGreaterThan(XP_THRESHOLDS[1])
    expect(normalXpForDungeon(1, rewardsConfig) * 100).toBeLessThan(XP_THRESHOLDS[2])
  })

  it('a boss is worth bossMult (10x) a normal kill, at every tier', () => {
    for (let tier = 1; tier <= 11; tier += 1) {
      const normal = normalXpForDungeon(tier, rewardsConfig)
      expect(rewardForBossKill(tier, rewardsConfig).xp, `tier ${tier}`).toBe(Math.round(normal * 10))
    }
  })

  it('easy/medium/hard bands multiply the normal unit 0.75 / 1 / 1.25, averaging medium', () => {
    const tier = 6
    const normal = normalXpForDungeon(tier, rewardsConfig)
    const { easy, medium, hard } = rewardsConfig.xp.difficulty
    expect(rewardForKill(tier, 'regular', rewardsConfig, easy).xp).toBe(Math.round(normal * 0.75))
    expect(rewardForKill(tier, 'regular', rewardsConfig, medium).xp).toBe(normal)
    expect(rewardForKill(tier, 'regular', rewardsConfig, hard).xp).toBe(Math.round(normal * 1.25))
    // a balanced easy+hard pair averages exactly two mediums (what keeps a
    // roster's average at 1x — content/monsters.ts tags one of each).
    expect(Math.round(normal * 0.75) + Math.round(normal * 1.25)).toBe(2 * normal)
  })

  it('ranks roles: a mimic beats a regular, a boss beats both, at every tier', () => {
    for (let tier = 1; tier <= 11; tier += 1) {
      const regular = rewardForKill(tier, 'regular', rewardsConfig)
      const mimic = rewardForKill(tier, 'mimic', rewardsConfig)
      const boss = rewardForBossKill(tier, rewardsConfig)
      expect(mimic.xp, `tier ${tier}`).toBeGreaterThan(regular.xp)
      expect(boss.xp, `tier ${tier}`).toBeGreaterThan(mimic.xp)
    }
  })
})

describe('reward coins — the unchanged M2/M3 tier-growth curve', () => {
  it('pays the tier-1 coin base with no growth applied', () => {
    expect(rewardForKill(1, 'regular', rewardsConfig).coins).toBe(5)
    expect(rewardForKill(1, 'boss', rewardsConfig).coins).toBe(30)
    expect(rewardForChest(1, rewardsConfig).coins).toBe(24)
  })

  it('grows the coin base by tierGrowth per tier above 1', () => {
    // tier 3 → factor 1 + 2*0.35 = 1.7; regular coins 5*1.7 = 8.5 → 9.
    expect(rewardForKill(3, 'regular', rewardsConfig).coins).toBe(9)
    // tier 11 boss coins: base 30 * 4.5 = 135, then bossCoinMult 1.5.
    expect(rewardForBossKill(11, rewardsConfig).coins).toBe(Math.round(135 * 1.5))
  })

  it('rewardForBossKill layers bossCoinMult onto the boss coin reward, at every tier', () => {
    for (let tier = 1; tier <= 11; tier += 1) {
      const plainCoins = rewardForKill(tier, 'boss', rewardsConfig).coins
      const bossCoins = rewardForBossKill(tier, rewardsConfig).coins
      expect(bossCoins, `tier ${tier}`).toBe(Math.round(plainCoins * rewardsConfig.bossCoinMult))
      expect(bossCoins, `tier ${tier}`).toBeGreaterThan(plainCoins)
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
