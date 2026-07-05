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

export interface RewardConfig {
  // Base payout at tier 1, per monster role.
  base: Record<MonsterRole, RewardAmount>
  // The real chest is a no-fight reward — its own base, tier-scaled the same way.
  realChest: RewardAmount
  // Each tier above 1 adds this fraction of the base amount.
  tierGrowth: number
}

const rewardsConfig: RewardConfig = {
  base: {
    regular: { xp: 8, coins: 5 },
    mimic: { xp: 14, coins: 10 },
    boss: { xp: 40, coins: 30 },
  },
  realChest: { xp: 30, coins: 24 },
  tierGrowth: 0.35,
}

export default rewardsConfig
