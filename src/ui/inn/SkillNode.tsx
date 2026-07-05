import { nodeStateClasses, type NodeVisualState } from '../common/nodeState'

interface SkillNodeProps {
  state: NodeVisualState
  cost: number
  canAfford: boolean
  onPurchase: () => void
}

// One node in a branch chain (design/README.md #4 / image 4a). Reuses the
// same 3-state language as the world map/dungeon graph (nodeState.ts), just
// rendered as a circle: purchased shows a checkmark, the next-in-line node
// shows its cost (dis/enabled by affordability, never re-styled as locked —
// "cost is always shown even when unaffordable, just not tappable"), and
// anything further down the branch shows "?".
const SkillNode = ({ state, cost, canAfford, onPurchase }: SkillNodeProps) => {
  const classes = nodeStateClasses(state, 'gold', 'circle')
  const clickable = state === 'available' && canAfford

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={onPurchase}
      className={`flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full font-mono text-[10px] font-bold ${classes.container} ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
    >
      {state === 'cleared' && <span className="text-[12px] text-[#2a1a08]">✓</span>}
      {state === 'available' && <span className={classes.label}>{cost}</span>}
      {state === 'locked' && <span className="text-node-locked-text-dim">?</span>}
    </button>
  )
}

export default SkillNode
