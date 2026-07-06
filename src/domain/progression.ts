import type { TextTier } from './types'

// The M2 skill tree (m2-implementation.html Story 4), retired from the save
// in M3 Story 0 (SaveData.skillTree is gone — see domain/save.ts's v2->v3
// migration). These two types stay only because engine/progression/
// skill-effects.ts's resolveModifiers still takes a SkillTreeState until
// Story 3 rewrites the seam to take a Character instead; delete both then.
export type SkillBranchId = 'endurance' | 'wordsmith' | 'focus' | 'luck' | 'utility'

// Per-branch purchased-node count.
export type SkillTreeState = Record<SkillBranchId, number>

// What the skill tree actually changes about combat, folded into one bag by
// resolveModifiers() (engine/progression/skill-effects.ts) so battle-store
// never has to know which branch grants what.
export interface PlayerModifiers {
  maxHp: number
  maxHearts: number
  wordsmithMaxTier: TextTier
  // Focus/Luck/Utility switch on in M5 (roadmap.html#m5):
  // timeLimitBonus, critChanceBonus, critDamageBonus, powerUpSlots
}
