import type { MonsterRole } from '../domain/types'

// Per-kill XP/coin rewards — a first-pass tuning curve (like combat.ts and
// skill-tree.ts's costs), flagged as an open balance knob in the M2 scope. The
// shape: a tier-1 base per role, grown by a flat fraction of that base for each
// tier above 1, so a tier-11 boss pays out far more than a tier-1 slime without
// a per-tier table. Rewards bank per-kill, immediately, even if the run later
// wipes (m2-implementation.html finding C), so an early full clear of a tier-1
// dungeon (~27 fights) earns enough to afford a first Endurance/Wordsmith node.

export interface RewardAmount {
  xp: number
  coins: number
}

// The real chest's three possible outcomes (m3-scope.html#loot, Story 12) —
// relative weights, not required to sum to 1 (engine/progression/rewards.ts's
// rollChestLoot normalizes). Placeholder split (Story 13/M5 tunes): coins
// stays the single most-likely single outcome so a chest is never a *worse*
// bet than before, but weapon+consumable together outweigh it so "which
// chest is real?" pays off with a genuine gear gamble most of the time.
export interface ChestLootWeights {
  coins: number
  weapon: number
  consumable: number
}

export interface RewardConfig {
  // Base payout at tier 1, per monster role.
  base: Record<MonsterRole, RewardAmount>
  // The real chest is a no-fight reward — its own base, tier-scaled the same way.
  realChest: RewardAmount
  // Each tier above 1 adds this fraction of the base amount.
  tierGrowth: number
  chestLootWeights: ChestLootWeights
  // "Bosses add a larger payout" (m3-scope.html#loot) — multiplies the
  // boss's already-bigger base.boss reward on top of the tier-growth scaling.
  bossPayoutMult: number
}

const rewardsConfig: RewardConfig = {
  base: {
    regular: { xp: 8, coins: 5 },
    mimic: { xp: 14, coins: 10 },
    boss: { xp: 40, coins: 30 },
  },
  realChest: { xp: 30, coins: 24 },
  tierGrowth: 0.35,
  chestLootWeights: { coins: 0.4, weapon: 0.25, consumable: 0.35 },
  bossPayoutMult: 1.5,
}

export default rewardsConfig
