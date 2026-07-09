import type { MonsterRole } from '../domain/types'

// Per-kill rewards. Split into two independently-tuned halves:
//
//  • COINS keep the original M2/M3 curve — a tier-1 base per role grown by a
//    flat fraction (tierGrowth) per tier. Deliberately left as-is: the shop
//    economy (config/weapons.ts, config/items.ts) is tuned against this income,
//    and the M5 XP retune must not disturb it.
//
//  • XP is the M5 retune (content-plan-v2-tuning.html): keep the real 5e level
//    thresholds (config/leveling.ts), and tune the per-dungeon NORMAL-kill XP
//    to them so ~100 normal kills raise a player one dungeon's worth up the
//    curve (~1.3 levels). normalPerDungeon holds that unit per dungeon — read
//    off the 5e thresholds at ~1.3-levels-per-dungeon spacing, then hand-nudged
//    to stay monotonic across the thresholds' own non-uniform deltas (a naive
//    read dips at the small L11→L12 gap). Everything else scales off that unit:
//    a boss is bossMult normals, a regular's easy/medium/hard band multiplies
//    it, a mimic is a fixed "hard surprise", the real chest a small hoard.
//
// Rewards bank per-kill, immediately, even if the run later wipes
// (m2-implementation.html finding C).

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

// The XP half of the reward model — see the file header. All XP flows from
// these knobs plus config/leveling.ts's XP_THRESHOLDS; no per-role/per-tier XP
// base survives (that was the flat-linear model M5 replaced).
export interface XpRewardConfig {
  // The normal (medium-difficulty) kill's XP, per dungeon (index 0 = D1). The
  // core tuned quantity — ~100 of these bridge a dungeon to the next target on
  // the 5e curve. Monotonic across dungeons by construction.
  normalPerDungeon: readonly number[]
  // A boss is worth this many normal kills ("bosses ~10x normal").
  bossMult: number
  // A mimic (chest fight) is a fixed "hard surprise" payout.
  mimicMult: number
  // The one real chest (no fight) — a small XP hoard on top of its coins.
  realChestMult: number
  // A regular monster's easy/medium/hard band, multiplying the normal unit.
  // Assigned per monster by WPM rank within its dungeon (content/monsters.ts's
  // xpDifficultyBand): weakest → easy, toughest → hard, averaging medium.
  difficulty: { easy: number; medium: number; hard: number }
}

export interface RewardConfig {
  // Coin base at tier 1, per monster role (see file header — coins only).
  baseCoins: Record<MonsterRole, number>
  // The real chest's tier-1 coin base, tier-scaled the same way.
  realChestCoins: number
  // Each tier above 1 adds this fraction of the coin base.
  tierGrowth: number
  // "Bosses add a larger payout" (m3-scope.html#loot) — multiplies the boss's
  // COIN reward on top of the tier-growth scaling (XP uses xp.bossMult).
  bossCoinMult: number
  chestLootWeights: ChestLootWeights
  xp: XpRewardConfig
}

const rewardsConfig: RewardConfig = {
  baseCoins: { regular: 5, mimic: 10, boss: 30 },
  realChestCoins: 24,
  tierGrowth: 0.35,
  bossCoinMult: 1.5,
  chestLootWeights: { coins: 0.4, weapon: 0.25, consumable: 0.35 },
  xp: {
    // ~1.3 levels/dungeon read off the 5e thresholds, hand-nudged monotonic.
    // Playing all 11 out (~100 kills each) lands a player near level 15 (the
    // implied targets step 2.33 → 3.61 → 4.89 → … → 15.44).
    normalPerDungeon: [5, 15, 41, 97, 127, 167, 230, 249, 251, 260, 340],
    bossMult: 10,
    mimicMult: 1.25,
    realChestMult: 3,
    difficulty: { easy: 0.75, medium: 1, hard: 1.25 },
  },
}

export default rewardsConfig
