import { ITEMS } from '../../config/items'
import type { RewardAmount, RewardConfig } from '../../config/rewards'
import { WEAPONS } from '../../config/weapons'
import type { ItemId } from '../../domain/items'
import type { MonsterRole, Rng } from '../../domain/types'
import type { WeaponId } from '../../domain/weapons'

// Pure reward math — no React, no save/combat imports. The dungeon UI (Story
// 11) reads these and dispatches award() per-kill.

// A normal (medium-difficulty) kill's XP in a tier-N dungeon — the tuned unit
// everything else scales off (config/rewards.ts's xp.normalPerDungeon; see its
// header for how the table tracks the 5e curve monotonically). Clamped so a
// tier past the table (e.g. the "tier 12" a boss unlock names) still resolves.
export const normalXpForDungeon = (dungeon: number, cfg: RewardConfig): number => {
  const table = cfg.xp.normalPerDungeon
  return table[Math.min(Math.max(dungeon, 1), table.length) - 1]
}

// Coins only: grow a tier-1 base by tierGrowth per tier above 1 (unchanged
// from M2/M3 — see config/rewards.ts's header on why the shop economy is kept).
const coinsForTier = (base: number, tier: number, growth: number): number =>
  Math.round(base * (1 + (tier - 1) * growth))

// The reward for defeating a monster of the given role in a tier-N dungeon.
// XP scales off the dungeon's normal-kill unit: a regular by its easy/medium/
// hard band (difficultyMult, defaulting to medium — the caller passes the
// monster's band, content/monsters.ts's xpDifficultyBand), a mimic by the
// fixed mimicMult, a boss by bossMult. Production routes the boss through
// rewardForBossKill (below) for its coin bonus + gear; this still handles
// 'boss' so the two agree on XP.
export const rewardForKill = (
  tier: number,
  role: MonsterRole,
  cfg: RewardConfig,
  difficultyMult: number = cfg.xp.difficulty.medium,
): RewardAmount => {
  const normal = normalXpForDungeon(tier, cfg)
  const xpMultByRole: Record<MonsterRole, number> = {
    boss: cfg.xp.bossMult,
    mimic: cfg.xp.mimicMult,
    regular: difficultyMult,
  }
  return { xp: Math.round(normal * xpMultByRole[role]), coins: coinsForTier(cfg.baseCoins[role], tier, cfg.tierGrowth) }
}

// The reward for opening the one real chest — a no-fight payout: a small XP
// hoard (realChestMult normals) plus tier-scaled coins.
export const rewardForChest = (tier: number, cfg: RewardConfig): RewardAmount => ({
  xp: Math.round(normalXpForDungeon(tier, cfg) * cfg.xp.realChestMult),
  coins: coinsForTier(cfg.realChestCoins, tier, cfg.tierGrowth),
})

// The boss's coin/xp payout — bossMult normals of XP (via rewardForKill), with
// bossCoinMult layered onto its coins on top (m3-scope.html#loot "Bosses add a
// larger payout").
export const rewardForBossKill = (tier: number, cfg: RewardConfig): RewardAmount => {
  const base = rewardForKill(tier, 'boss', cfg)
  return { xp: base.xp, coins: Math.round(base.coins * cfg.bossCoinMult) }
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
