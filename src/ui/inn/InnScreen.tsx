import { toMap, type Screen } from '../../app/navigation'
import { SKILL_TREE } from '../../config/skill-tree'
import type { SkillBranchId } from '../../domain/progression'
import { resolveModifiers } from '../../engine/progression/skill-effects'
import { purchaseSkillNode } from '../../state/save/save-reducer'
import { useSave } from '../../state/save/SaveProvider'
import Frame from '../common/Frame'
import StatusReadout from '../common/StatusReadout'
import SkillBranch from './SkillBranch'

interface InnScreenProps {
  onNavigate: (screen: Screen) => void
}

const BRANCH_ORDER: SkillBranchId[] = ['endurance', 'wordsmith', 'focus', 'luck', 'utility']

// The Inn's skill tree (image 4a) — first screen that mutates the save.
const InnScreen = ({ onNavigate }: InnScreenProps) => {
  const { save, dispatch } = useSave()
  // Full hearts outside a run — they only deplete mid-dungeon (feedback #5).
  const { maxHearts } = resolveModifiers(save.skillTree)

  return (
    <Frame maxWidth={1080}>
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          className="font-mono text-xs text-text-dim hover:text-accent-gold-bright"
          onClick={() => onNavigate(toMap())}
        >
          ← World Map
        </button>
        <h1 className="font-display text-[22px] font-bold tracking-[0.12em] text-accent-gold-bright uppercase">
          The Inn — Skill Tree
        </h1>
        <StatusReadout xp={save.xp} coins={save.coins} hearts={maxHearts} maxHearts={maxHearts} />

      </div>

      <div className="flex items-end justify-center gap-4.5">
        {BRANCH_ORDER.map((branchId) => (
          <SkillBranch
            key={branchId}
            branch={SKILL_TREE[branchId]}
            purchasedCount={save.skillTree[branchId]}
            xp={save.xp}
            onPurchase={(cost) => dispatch(purchaseSkillNode(branchId, cost))}
          />
        ))}
      </div>
    </Frame>
  )
}

export default InnScreen
