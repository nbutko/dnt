import type { DungeonTier } from '../../config/dungeon-tiers'
import TierCard from './TierCard'

interface TierTrailProps {
  tiers: readonly DungeonTier[]
  highestUnlockedTier: number
  onSelectTier: (tier: number) => void
}

// cleared(N) = N < highestUnlockedTier (m2-implementation.html finding D —
// highestUnlockedTier reaches 12 once tier 11 is cleared too, so this holds
// for every tier with no special-casing).
const tierState = (tier: number, highestUnlockedTier: number) => {
  if (tier < highestUnlockedTier) return 'cleared' as const
  if (tier === highestUnlockedTier) return 'available' as const
  return 'locked' as const
}

// The horizontally-scrolling dashed trail of tier cards (design/README.md
// §2).
const TierTrail = ({ tiers, highestUnlockedTier, onSelectTier }: TierTrailProps) => (
  <div className="flex-1 overflow-x-auto px-1 py-2.5">
    <div className="relative flex min-w-[1400px] items-center gap-9 px-2.5 py-5">
      {/* Runs card-center to card-center (container padding + half a card's
          88px wrapper width = 54px), not edge-to-edge — otherwise it pokes
          out past the first/last card instead of reading as the start/end
          of the chain. Cards occlude it everywhere in between (see
          nodeState.ts's solid locked background). */}
      <div
        className="absolute top-1/2 left-[54px] right-[54px] h-0.5"
        style={{ background: 'repeating-linear-gradient(90deg, #7a5a22 0 8px, transparent 8px 16px)' }}
      />
      {tiers.map((dungeonTier) => (
        <TierCard
          key={dungeonTier.tier}
          tier={dungeonTier}
          state={tierState(dungeonTier.tier, highestUnlockedTier)}
          onSelect={() => onSelectTier(dungeonTier.tier)}
        />
      ))}
    </div>
  </div>
)

export default TierTrail
