import type { DungeonTier } from '../../config/dungeon-tiers'
import { nodeStateClasses, type NodeFamily, type NodeVisualState } from '../common/nodeState'

interface TierCardProps {
  tier: DungeonTier
  state: NodeVisualState
  onSelect: () => void
}

// Literal class names (not string-built) so Tailwind's scanner can see them.
const LOCK_ICON_CLASSES: Record<NodeFamily, { border: string; fill: string }> = {
  gold: { border: 'border-node-locked-text', fill: 'bg-node-locked-text' },
  danger: { border: 'border-node-danger-locked-text', fill: 'bg-node-danger-locked-text' },
}

// One 76x92 tier tile on the world map trail (design/README.md §2). Urban
// (tier 11) uses the danger family so it stays red-tinted even locked, per
// the same rule as the dungeon graph's boss node.
const TierCard = ({ tier, state, onSelect }: TierCardProps) => {
  const family = tier.tier === 11 ? 'danger' : 'gold'
  const classes = nodeStateClasses(state, family)
  const clickable = state !== 'locked'

  return (
    <div className="relative z-[1] flex w-[88px] flex-none flex-col items-center gap-1.5">
      <button
        type="button"
        disabled={!clickable}
        onClick={onSelect}
        className={`relative flex h-[92px] w-[76px] flex-col items-center justify-center gap-1 rounded-lg ${classes.container} ${clickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
      >
        {state === 'cleared' && (
          <span className="absolute -top-2 -right-2 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-border-gold bg-accent-gold-bright font-mono text-[11px] font-bold text-[#2a1a08]">
            ✓
          </span>
        )}
        {state === 'locked' && (
          <span aria-hidden className="flex flex-col items-center">
            <span
              className={`h-2.5 w-3.5 rounded-t-full border-2 border-b-0 ${LOCK_ICON_CLASSES[family].border}`}
            />
            <span className={`-mt-1.5 h-3.5 w-5 rounded-sm ${LOCK_ICON_CLASSES[family].fill}`} />
          </span>
        )}
        <span className={`px-1 text-center font-display text-xs ${classes.label}`}>{tier.habitat}</span>
        <span className="font-mono text-[10px] text-text-dim">Tier {tier.tier}</span>
      </button>
    </div>
  )
}

export default TierCard
