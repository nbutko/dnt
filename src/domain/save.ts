// Persistent save (state/save/) — see m2-implementation.html#state. Opposite
// lifetime from the ephemeral dungeon-run store: this survives reload, that
// doesn't.

import type { Character } from './character'
import type { ItemId } from './items'
import type { WeaponId } from './weapons'

export interface SaveData {
  version: 3
  // null is the "uncreated" marker (finding G, m3-implementation.html) — a
  // fresh or freshly-migrated save routes the player through character
  // creation (Story 4) before the world map, gated in GameShell.
  character: Character | null
  coins: number
  equippedWeapon: WeaponId
  inventory: {
    weapons: WeaponId[]
    consumables: Record<ItemId, number>
  }
  hearts: { max: number }
  // Reaches 12 to mean "tier 11 (Urban) cleared too" — see m2-implementation
  // finding D. cleared(N) = N < highestUnlockedTier.
  highestUnlockedTier: number
  monstersDefeated: string[]
  stats: { battlesWon: number; battlesLost: number; bestWpm: number }
}

export const defaultSave = (): SaveData => ({
  version: 3,
  character: null,
  coins: 0,
  // A cheap, tier-1 starter every class can swing (m3-scope.html#weapons) —
  // config/weapons.ts (Story 1) gives it a real die/ability/price; Story 4's
  // character creation may override this per class later.
  equippedWeapon: 'dagger',
  inventory: {
    weapons: ['dagger'],
    consumables: {
      'potion-healing': 0,
      'potion-greater-healing': 0,
      'bulls-strength': 0,
      'elixir-of-might': 0,
      'potion-of-speed': 0,
      guidance: 0,
      luckstone: 0,
      'oil-of-sharpness': 0,
      'elixir-of-intellect': 0,
      'potion-of-heroism': 0,
    },
  },
  hearts: { max: 1 },
  highestUnlockedTier: 1,
  monstersDefeated: [],
  stats: { battlesWon: 0, battlesLost: 0, bestWpm: 0 },
})

const isSaveData = (raw: unknown): raw is SaveData =>
  typeof raw === 'object' &&
  raw !== null &&
  (raw as { version?: unknown }).version === 3 &&
  typeof (raw as { coins?: unknown }).coins === 'number' &&
  ((raw as { character?: unknown }).character === null ||
    typeof (raw as { character?: unknown }).character === 'object') &&
  typeof (raw as { equippedWeapon?: unknown }).equippedWeapon === 'string' &&
  typeof (raw as { inventory?: unknown }).inventory === 'object'

// The exact v2 shape (domain/progression.ts's SkillTreeState) — kept local
// since it only exists to be migrated away from here.
interface SaveDataV2 {
  version: 2
  coins: number
  xp: number
  skillTree: Record<string, number>
  hearts: { max: number }
  highestUnlockedTier: number
  monstersDefeated: string[]
  stats: { battlesWon: number; battlesLost: number; bestWpm: number }
}

const isV2SaveData = (raw: unknown): raw is SaveDataV2 =>
  typeof raw === 'object' &&
  raw !== null &&
  (raw as { version?: unknown }).version === 2 &&
  typeof (raw as { coins?: unknown }).coins === 'number' &&
  typeof (raw as { skillTree?: unknown }).skillTree === 'object'

// v2 -> v3 (finding A, m3-implementation.html): keeps coins, the tier unlock,
// the defeated-monster list, and stats; drops the retired skillTree; sets
// character: null so the player is routed through character creation once
// (finding G). Rather than invent a character for an existing player,
// m3-scope.html's "Migration from a v2 save" explicitly calls this
// acceptable — this is a solo project with one real player, not a live
// service.
const migrateV2 = (v2: SaveDataV2): SaveData => ({
  ...defaultSave(),
  coins: v2.coins,
  highestUnlockedTier: v2.highestUnlockedTier,
  monstersDefeated: v2.monstersDefeated,
  stats: v2.stats,
})

// Anything unrecognized (missing, corrupt, or older than v2) falls back to a
// fresh v3 save rather than crashing the app on load.
export const migrate = (raw: unknown): SaveData => {
  if (isSaveData(raw)) return raw
  if (isV2SaveData(raw)) return migrateV2(raw)
  return defaultSave()
}

// Dev-only escape hatch: wipes to a fresh v3 save. Not wired to any UI yet —
// for manual console use (or a future dev-menu story) when a save gets into a
// state not worth migrating. Per m3-scope.html, wiping is explicitly
// acceptable for our single real player.
export const hardResetSave = (): SaveData => defaultSave()
