import type { TextTier } from '../domain/types'

export interface DungeonTier {
  tier: number
  habitat: string
  wpmRange: [number, number]
  textTierRange: [TextTier, TextTier]
  // Story 7 roster queries key off this; plain data reference, no logic here.
  rosterPool: string
}

// The 11 dungeons, in ladder order — transcribed from m2-scope.html's tier
// table (habitat, WPM range, text tier range). Boss CR / example monsters
// live in monster-manual.json + the scope doc; this file only carries what
// the world map and dungeon generator need as data.
export const DUNGEON_TIERS: readonly DungeonTier[] = [
  { tier: 1, habitat: 'Grassland', wpmRange: [10, 15], textTierRange: [1, 1], rosterPool: 'grassland' },
  { tier: 2, habitat: 'Forest', wpmRange: [14, 20], textTierRange: [1, 2], rosterPool: 'forest' },
  { tier: 3, habitat: 'Hill', wpmRange: [19, 26], textTierRange: [2, 2], rosterPool: 'hill' },
  { tier: 4, habitat: 'Coastal', wpmRange: [25, 33], textTierRange: [2, 3], rosterPool: 'coastal' },
  { tier: 5, habitat: 'Desert', wpmRange: [32, 41], textTierRange: [3, 3], rosterPool: 'desert' },
  { tier: 6, habitat: 'Swamp', wpmRange: [39, 49], textTierRange: [3, 4], rosterPool: 'swamp' },
  { tier: 7, habitat: 'Mountain', wpmRange: [46, 57], textTierRange: [4, 5], rosterPool: 'mountain' },
  { tier: 8, habitat: 'Arctic', wpmRange: [54, 65], textTierRange: [5, 6], rosterPool: 'arctic' },
  { tier: 9, habitat: 'Underdark', wpmRange: [62, 74], textTierRange: [6, 7], rosterPool: 'underdark' },
  { tier: 10, habitat: 'Underwater', wpmRange: [72, 86], textTierRange: [7, 8], rosterPool: 'underwater' },
  { tier: 11, habitat: 'Urban', wpmRange: [85, 100], textTierRange: [8, 10], rosterPool: 'urban' },
]
