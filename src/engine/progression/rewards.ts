import type { RewardAmount, RewardConfig } from '../../config/rewards'
import type { MonsterRole } from '../../domain/types'

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
