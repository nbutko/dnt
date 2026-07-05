// Persistent save (state/save/) — see m2-implementation.html#state. Opposite
// lifetime from the ephemeral dungeon-run store: this survives reload, that
// doesn't.

export type SkillBranchId = 'endurance' | 'wordsmith' | 'focus' | 'luck' | 'utility'

export interface SaveData {
  version: 2
  coins: number
  xp: number
  // Purchased-node count per branch — Story 4's config/skill-tree.ts turns
  // this count into actual effects via resolveModifiers().
  skillTree: Record<SkillBranchId, number>
  hearts: { max: number }
  // Reaches 12 to mean "tier 11 (Urban) cleared too" — see m2-implementation
  // finding D. cleared(N) = N < highestUnlockedTier.
  highestUnlockedTier: number
  monstersDefeated: string[]
  stats: { battlesWon: number; battlesLost: number; bestWpm: number }
}

export const defaultSave = (): SaveData => ({
  version: 2,
  coins: 0,
  xp: 0,
  skillTree: { endurance: 0, wordsmith: 0, focus: 0, luck: 0, utility: 0 },
  hearts: { max: 1 },
  highestUnlockedTier: 1,
  monstersDefeated: [],
  stats: { battlesWon: 0, battlesLost: 0, bestWpm: 0 },
})

const isSaveData = (raw: unknown): raw is SaveData =>
  typeof raw === 'object' &&
  raw !== null &&
  (raw as { version?: unknown }).version === 2 &&
  typeof (raw as { coins?: unknown }).coins === 'number' &&
  typeof (raw as { xp?: unknown }).xp === 'number' &&
  typeof (raw as { skillTree?: unknown }).skillTree === 'object'

// Anything unrecognized (missing, corrupt, or a pre-v2 shape) falls back to
// a fresh save rather than crashing the app on load.
export const migrate = (raw: unknown): SaveData => (isSaveData(raw) ? raw : defaultSave())
