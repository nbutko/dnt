import type { TextTier } from './types'

// The rules behind the Inn (m2-implementation.html Story 4). SkillBranchId is
// defined here (not domain/save.ts) since it's a progression-domain concept —
// save.ts imports it back for the SaveData.skillTree shape.
export type SkillBranchId = 'endurance' | 'wordsmith' | 'focus' | 'luck' | 'utility'

// Per-branch purchased-node count — same shape as SaveData['skillTree'], but
// named for what it is here rather than tied to the save's persistence role.
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
