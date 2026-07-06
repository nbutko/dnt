import { ITEMS } from '../../config/items'
import type { RewardAmount, RewardConfig } from '../../config/rewards'
import { WEAPONS } from '../../config/weapons'
import type { ItemId } from '../../domain/items'
import type { MonsterRole, Rng } from '../../domain/types'
import type { WeaponId } from '../../domain/weapons'

// Pure reward math — no React, no save/combat imports. The dungeon UI (Story
// 11) reads these and dispatches award() per-kill.

// Grow a tier-1 base by tierGrowth per tier above 1, rounded to whole points.
const scale = (base: RewardAmount, tier: number, growth: number): RewardAmount => {
  const factor = 1 + (tier - 1) * growth
  return { xp: Math.round(base.xp * factor), coins: Math.round(base.coins * factor) }
}

// The reward for defeating a monster of the given role in a tier-N dungeon.
export const rewardForKill = (
  tier: number,
  role: MonsterRole,
  cfg: RewardConfig,
): RewardAmount => scale(cfg.base[role], tier, cfg.tierGrowth)

// The reward for opening the one real chest — a flat payout, no fight.
export const rewardForChest = (tier: number, cfg: RewardConfig): RewardAmount =>
  scale(cfg.realChest, tier, cfg.tierGrowth)

// The boss's coin/xp payout — the same tier-scaled base.boss reward as
// rewardForKill('boss', ...), multiplied by bossPayoutMult on top (finding:
// m3-scope.html#loot "Bosses add a larger payout").
export const rewardForBossKill = (tier: number, cfg: RewardConfig): RewardAmount => {
  const base = scale(cfg.base.boss, tier, cfg.tierGrowth)
  return {
    xp: Math.round(base.xp * cfg.bossPayoutMult),
    coins: Math.round(base.coins * cfg.bossPayoutMult),
  }
}

// A tier-appropriate pool never offers gear above the dungeon's own tier
// (m3-implementation.html Story 12: "no tier-11 greataxe from a tier-1
// chest") — every launch weapon/item is tier 1-3 (config/weapons.ts,
// config/items.ts), so this only actually restricts anything for tiers 1-2;
// every dungeon tier >= 3 draws from the full pool. Always non-empty since
// both tables carry tier-1 entries.
const weaponPoolForTier = (tier: number) => WEAPONS.filter((weapon) => weapon.tier <= tier)
const itemPoolForTier = (tier: number) => ITEMS.filter((item) => item.tier <= tier)

const pick = <T,>(pool: readonly T[], rng: Rng): T => pool[Math.floor(rng.next() * pool.length)]

// The boss's guaranteed gear drop (m3-scope.html#loot: "can guarantee a gear
// drop") — always a weapon, drawn from the toughest tier bracket the
// dungeon's own tier unlocks (never a starter dagger from a hard-won boss),
// so a first clear's guaranteed gear actually feels like an upgrade. Still
// seeded, so a given boss kill's drop is reproducible.
export const rewardForBossGear = (tier: number, rng: Rng): WeaponId => {
  const pool = weaponPoolForTier(tier)
  const bestTier = Math.max(...pool.map((weapon) => weapon.tier))
  const topBracket = pool.filter((weapon) => weapon.tier === bestTier)
  return pick(topBracket, rng).id
}

// The real chest's roll (m3-scope.html#loot): a weapon, a consumable, or a
// coin hoard — the "which chest is real?" gamble now has three different
// payoffs instead of one. Pure + seeded (same rng discipline as
// engine/dice/encounter-roll.ts) so a given chest's drop is reproducible for
// tests and for replaying a specific seed.
export type ChestLoot =
  | { kind: 'coins'; amount: RewardAmount }
  | { kind: 'weapon'; weaponId: WeaponId }
  | { kind: 'consumable'; itemId: ItemId }

export const rollChestLoot = (tier: number, rng: Rng, cfg: RewardConfig): ChestLoot => {
  const { coins, weapon, consumable } = cfg.chestLootWeights
  const total = coins + weapon + consumable
  const roll = rng.next() * total

  if (roll < coins) {
    return { kind: 'coins', amount: rewardForChest(tier, cfg) }
  }
  if (roll < coins + weapon) {
    return { kind: 'weapon', weaponId: pick(weaponPoolForTier(tier), rng).id }
  }
  return { kind: 'consumable', itemId: pick(itemPoolForTier(tier), rng).id }
}
