// Persistent save (state/save/) — see m2-implementation.html#state. Opposite
// lifetime from the ephemeral dungeon-run store: this survives reload, that
// doesn't.

import { earnedAsiPoints, levelForXp, reconcileLevel } from '../engine/character/leveling'
import type { Character } from './character'
import type { ItemId } from './items'
import type { WeaponId } from './weapons'

export interface SaveData {
  version: 4
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
  version: 4,
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
      'ring-of-protection': 0,
    },
  },
  hearts: { max: 1 },
  highestUnlockedTier: 1,
  monstersDefeated: [],
  stats: { battlesWon: 0, battlesLost: 0, bestWpm: 0 },
})

// The v3 shape is structurally identical to v4 (no field added/removed) — the
// bump exists only to run the one-time character reconciliation below exactly
// once. So the shape check is shared; only the version literal differs.
const hasSaveShape = (raw: unknown, version: number): boolean =>
  typeof raw === 'object' &&
  raw !== null &&
  (raw as { version?: unknown }).version === version &&
  typeof (raw as { coins?: unknown }).coins === 'number' &&
  ((raw as { character?: unknown }).character === null ||
    typeof (raw as { character?: unknown }).character === 'object') &&
  typeof (raw as { equippedWeapon?: unknown }).equippedWeapon === 'string' &&
  typeof (raw as { inventory?: unknown }).inventory === 'object'

const isSaveData = (raw: unknown): raw is SaveData => hasSaveShape(raw, 4)

// The v3 shape (identical fields, version 3) — kept local since it only exists
// to be reconciled forward into v4 here.
type SaveDataV3 = Omit<SaveData, 'version'> & { version: 3 }

const isV3SaveData = (raw: unknown): raw is SaveDataV3 => hasSaveShape(raw, 3)

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

// v2 -> v4 (finding A, m3-implementation.html): keeps coins, the tier unlock,
// the defeated-monster list, and stats; drops the retired skillTree; sets
// character: null so the player is routed through character creation once
// (finding G). Rather than invent a character for an existing player,
// m3-scope.html's "Migration from a v2 save" explicitly calls this
// acceptable — this is a solo project with one real player, not a live
// service. (There's no v2 character to reconcile, so it jumps straight to v4.)
const migrateV2 = (v2: SaveDataV2): SaveData => ({
  ...defaultSave(),
  coins: v2.coins,
  highestUnlockedTier: v2.highestUnlockedTier,
  monstersDefeated: v2.monstersDefeated,
  stats: v2.stats,
})

// v3 -> v4: through v3 the only live XP path (state/save/save-reducer.ts's
// `award`) bumped xp but never re-derived level or banked ASI points, so every
// v3 character is frozen at level 1 with pendingAsi 0 no matter how much XP it
// holds — HP (engine/character/modifiers.ts derives it off level) never rose,
// and the Inn's ASI banner (gated on pendingAsi > 0) never appeared. Re-derive
// the real level from the XP total and bank the points earned along the way.
// Because pendingAsi was unreachable before v4, nothing was ever spent, so
// earned == owed. Bumps the version so this one-time backfill runs exactly once
// (a re-run would double-bank).
const migrateV3 = (v3: SaveDataV3): SaveData => {
  const character = v3.character
    ? { ...v3.character, level: levelForXp(v3.character.xp), pendingAsi: earnedAsiPoints(levelForXp(v3.character.xp)) }
    : v3.character
  return { ...v3, version: 4, character }
}

// Anything unrecognized (missing, corrupt, or older than v2) falls back to a
// fresh v4 save rather than crashing the app on load. A well-formed v4 save
// still has its level re-derived from XP on the way through (reconcileLevel is
// idempotent) — cheap insurance so a level can't drift from its XP, e.g. after
// an XP-curve retune shifts the thresholds.
export const migrate = (raw: unknown): SaveData => {
  if (isSaveData(raw)) return raw.character ? { ...raw, character: reconcileLevel(raw.character) } : raw
  if (isV3SaveData(raw)) return migrateV3(raw)
  if (isV2SaveData(raw)) return migrateV2(raw)
  return defaultSave()
}

// Dev-only escape hatch: wipes to a fresh v4 save. Not wired to any UI yet —
// for manual console use (or a future dev-menu story) when a save gets into a
// state not worth migrating. Per m3-scope.html, wiping is explicitly
// acceptable for our single real player.
export const hardResetSave = (): SaveData => defaultSave()
