import type { TextTier } from '../domain/types'

export interface DungeonTier {
  tier: number
  habitat: string
  wpmRange: [number, number]
  // The dungeon's three regular text tiers [N, N+2] — the encounter d20's
  // low/mid/high band reads straight off this (engine/dice/band.ts). The 14-tier
  // content ladder (content-plan-v2.html §2) keys every dungeon N to text
  // [N, N+2] regular; the shipped corpus (content/text/library.json) carries
  // exactly those tiers per dungeon.
  textTierRange: [TextTier, TextTier]
  // The boss's single text tier, N+3 — the boss serves the dungeon's hardest,
  // longest set-piece prose (content §5), one tier above the regular ceiling.
  // DungeonScreen collapses the boss's band to [bossTextTier, bossTextTier] so
  // every roll lands on it (the fumble/inspired crit rules still apply).
  bossTextTier: TextTier
  // Story 7 roster queries key off this; plain data reference, no logic here.
  rosterPool: string
}

// The 11 dungeons, in ladder order. Each dungeon N serves regular text tiers
// [N, N+2] and its boss N+3 (content-plan-v2.html §2) — the world map, dungeon
// generator, and content loader all key off this ladder. WPM ranges carry over
// from m2-scope's tier table.
export const DUNGEON_TIERS: readonly DungeonTier[] = [
  { tier: 1, habitat: 'Grassland', wpmRange: [10, 30], textTierRange: [1, 3], bossTextTier: 4, rosterPool: 'grassland' },
  { tier: 2, habitat: 'Forest', wpmRange: [14, 20], textTierRange: [2, 4], bossTextTier: 5, rosterPool: 'forest' },
  { tier: 3, habitat: 'Hill', wpmRange: [19, 26], textTierRange: [3, 5], bossTextTier: 6, rosterPool: 'hill' },
  { tier: 4, habitat: 'Coastal', wpmRange: [25, 33], textTierRange: [4, 6], bossTextTier: 7, rosterPool: 'coastal' },
  { tier: 5, habitat: 'Desert', wpmRange: [32, 41], textTierRange: [5, 7], bossTextTier: 8, rosterPool: 'desert' },
  { tier: 6, habitat: 'Swamp', wpmRange: [39, 49], textTierRange: [6, 8], bossTextTier: 9, rosterPool: 'swamp' },
  { tier: 7, habitat: 'Mountain', wpmRange: [46, 57], textTierRange: [7, 9], bossTextTier: 10, rosterPool: 'mountain' },
  { tier: 8, habitat: 'Arctic', wpmRange: [54, 65], textTierRange: [8, 10], bossTextTier: 11, rosterPool: 'arctic' },
  { tier: 9, habitat: 'Underdark', wpmRange: [62, 74], textTierRange: [9, 11], bossTextTier: 12, rosterPool: 'underdark' },
  { tier: 10, habitat: 'Underwater', wpmRange: [72, 86], textTierRange: [10, 12], bossTextTier: 13, rosterPool: 'underwater' },
  { tier: 11, habitat: 'Urban', wpmRange: [85, 100], textTierRange: [11, 13], bossTextTier: 14, rosterPool: 'urban' },
]
