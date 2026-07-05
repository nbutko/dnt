import combat from '../../config/combat'
import { SKILL_TREE } from '../../config/skill-tree'
import type { PlayerModifiers, SkillTreeState } from '../../domain/progression'
import type { TextTier } from '../../domain/types'

const BASE_MAX_HEARTS = 1 // matches domain/save.ts's defaultSave()
const BASE_WORDSMITH_TIER: TextTier = 1

// Folds purchased Endurance/Wordsmith node counts into the modifiers battle
// code actually reads. Locked branches (Focus/Luck/Utility) never contribute
// — their node counts stay 0 for the whole of M2 since the Inn UI never
// exposes a buyable node for them (m2-implementation.html Story 4/5).
export const resolveModifiers = (skillTree: SkillTreeState): PlayerModifiers => {
  const enduranceNodes = SKILL_TREE.endurance.nodes.slice(0, skillTree.endurance)
  const maxHp = enduranceNodes.reduce((sum, node) => sum + (node.hp ?? 0), combat.playerMaxHp)
  const maxHearts = enduranceNodes.reduce((sum, node) => sum + (node.hearts ?? 0), BASE_MAX_HEARTS)

  const wordsmithNodes = SKILL_TREE.wordsmith.nodes.slice(0, skillTree.wordsmith)
  const lastWordsmithNode = wordsmithNodes.at(-1)
  const wordsmithMaxTier = lastWordsmithNode?.maxTier ?? BASE_WORDSMITH_TIER

  return { maxHp, maxHearts, wordsmithMaxTier }
}
