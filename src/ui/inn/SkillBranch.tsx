import { Fragment } from 'react'
import type { SkillBranchConfig } from '../../config/skill-tree'
import type { NodeVisualState } from '../common/nodeState'
import SkillNode from './SkillNode'

interface SkillBranchProps {
  branch: SkillBranchConfig
  purchasedCount: number
  xp: number
  onPurchase: (cost: number) => void
}

const CAPTION_CLASS: Record<NodeVisualState, string> = {
  cleared: 'text-coin',
  available: 'text-accent-gold-bright',
  locked: 'text-node-locked-text-dim',
}

// One branch column (design/README.md #4 / image 4a): column-reverse so the
// cheapest node sits at the bottom and the tree "grows" upward. Locked
// branches (Focus/Luck/Utility, status:'locked') render every node inert —
// no cost shown, nothing tappable — regardless of the illustrative costs in
// config/skill-tree.ts, since M2 never lets purchasedCount move for them.
const SkillBranch = ({ branch, purchasedCount, xp, onPurchase }: SkillBranchProps) => {
  const isLocked = branch.status === 'locked'

  const nodeState = (index: number): NodeVisualState => {
    if (isLocked) return 'locked'
    if (index < purchasedCount) return 'cleared'
    if (index === purchasedCount) return 'available'
    return 'locked'
  }

  return (
    <div className="flex w-[190px] flex-none flex-col items-center rounded-lg border-2 border-border-gold bg-panel-monster-from/25 px-3 pt-3.5 pb-[18px]">
      <h3 className="mb-3.5 text-center font-display text-[13px] tracking-[0.06em] text-accent-gold-bright uppercase">
        {branch.label}
      </h3>
      {isLocked && (
        <p className="mb-2 text-center font-body text-[11px] text-text-dim italic">Coming soon</p>
      )}
      <div className="flex flex-col-reverse items-center">
        {branch.nodes.map((node, index) => {
          const state = nodeState(index)
          return (
            <Fragment key={node.label + String(index)}>
              {index > 0 && (
                <div
                  className={`h-[22px] w-0.5 ${index - 1 < purchasedCount && !isLocked ? 'bg-border-gold' : 'bg-node-locked-border'}`}
                />
              )}
              <div className="mb-0.5 flex items-center gap-2.5">
                <SkillNode
                  state={state}
                  cost={node.cost}
                  canAfford={xp >= node.cost}
                  onPurchase={() => onPurchase(node.cost)}
                />
                <span className={`font-body text-[11px] ${CAPTION_CLASS[state]}`}>{node.label}</span>
              </div>
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}

export default SkillBranch
