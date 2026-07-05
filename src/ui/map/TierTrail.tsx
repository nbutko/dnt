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
    {/* No min-width here — the row must size to its actual content. A fixed
        min-width wider than the real content (11 cards + gaps) left dead
        space past the last card, and the line's right inset (measured from
        the container's edge) landed in that dead space instead of at the
        last card's center, poking out past it. */}
    <div className="relative flex items-center gap-9 px-2.5 py-5">
      {/* Runs card-center to card-center (container padding + half a card's
          108px wrapper width = 64px), not edge-to-edge — otherwise it pokes
          out past the first/last card instead of reading as the start/end
          of the chain. Cards occlude it everywhere in between (see
          nodeState.ts's solid locked background). */}
      <div
        className="absolute top-1/2 left-[64px] right-[64px] h-0.5"
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
