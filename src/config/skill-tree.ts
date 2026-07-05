import type { SkillBranchId } from '../domain/progression'
import type { TextTier } from '../domain/types'

// One node in a branch's strictly-sequential chain (must buy node n before
// n+1 unlocks — see design/README.md #4). `hp`/`hearts`/`maxTier` are read by
// resolveModifiers(); locked branches' nodes carry none of them since they
// grant nothing yet (m2-scope.html#inn, m2-implementation.html Story 4).
export interface SkillTreeNode {
  cost: number
  label: string
  hp?: number
  hearts?: number
  maxTier?: TextTier
}

export interface SkillBranchConfig {
  id: SkillBranchId
  label: string
  status: 'active' | 'locked'
  nodes: readonly SkillTreeNode[]
}

// Costs are a first-pass tuning knob (like combat.ts's constants) — no
// playtesting data yet, just a plausible increasing curve per branch.
export const SKILL_TREE: Record<SkillBranchId, SkillBranchConfig> = {
  endurance: {
    id: 'endurance',
    label: 'Endurance',
    status: 'active',
    nodes: [
      { cost: 50, label: '+20 max HP', hp: 20 },
      { cost: 90, label: '+20 max HP', hp: 20 },
      { cost: 150, label: '+1 max heart', hearts: 1 },
      { cost: 220, label: '+1 max heart', hearts: 1 },
    ],
  },
  wordsmith: {
    id: 'wordsmith',
    label: 'Wordsmith',
    status: 'active',
    nodes: [
      { cost: 60, label: 'Text tier 2', maxTier: 2 },
      { cost: 100, label: 'Text tier 4', maxTier: 4 },
      { cost: 160, label: 'Text tier 6', maxTier: 6 },
      { cost: 240, label: 'Text tier 8', maxTier: 8 },
      { cost: 320, label: 'Text tier 10', maxTier: 10 },
    ],
  },
  // Focus/Luck/Utility: present for layout (design/README.md #4), but switch
  // on in M5 (roadmap.html#m5) — no purchasable nodes yet, so costs/effects
  // here are illustrative only and never read by resolveModifiers().
  focus: {
    id: 'focus',
    label: 'Focus',
    status: 'locked',
    nodes: [
      { cost: 90, label: '+10% time limit' },
      { cost: 140, label: '+20% time limit' },
      { cost: 200, label: '+35% time limit' },
    ],
  },
  luck: {
    id: 'luck',
    label: 'Luck',
    status: 'locked',
    nodes: [
      { cost: 100, label: '+3% crit chance' },
      { cost: 150, label: '+3% crit chance' },
      { cost: 210, label: '+25% crit dmg' },
    ],
  },
  utility: {
    id: 'utility',
    label: 'Utility',
    status: 'locked',
    nodes: [
      { cost: 80, label: '+1 power-up slot' },
      { cost: 130, label: '+1 power-up slot' },
      { cost: 190, label: '+1 power-up slot' },
    ],
  },
}
