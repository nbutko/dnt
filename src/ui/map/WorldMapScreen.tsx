import { toDungeon, toInn, type Screen } from '../../app/navigation'
import { DUNGEON_TIERS } from '../../config/dungeon-tiers'
import { useSave } from '../../state/save/SaveProvider'
import Frame from '../common/Frame'
import Legend from '../common/Legend'
import ResourcePill from '../common/ResourcePill'
import HubCard from './HubCard'
import TierTrail from './TierTrail'

interface WorldMapScreenProps {
  onNavigate: (screen: Screen) => void
}

// The launch hub (image 3a): Inn/Shop column + the 11-tier trail, driven by
// the real save's highestUnlockedTier.
const WorldMapScreen = ({ onNavigate }: WorldMapScreenProps) => {
  const { save } = useSave()

  return (
    <Frame maxWidth={1080}>
      <div className="relative mb-5 text-center">
        <h1 className="font-display text-[22px] font-bold tracking-[0.12em] text-accent-gold-bright uppercase">
          World Map
        </h1>
        <div className="mt-1 font-mono text-[11px] text-text-dim">
          highestUnlockedTier: {save.highestUnlockedTier}
        </div>
        {/* XP/gold readout, mirroring the Inn header (feedback #5). */}
        <div className="absolute top-0 right-0 flex gap-2.5">
          <ResourcePill kind="xp" amount={save.xp} />
          <ResourcePill kind="coins" amount={save.coins} />
        </div>
      </div>

      <div className="flex items-stretch gap-6">
        <div className="flex w-[168px] flex-none flex-col gap-3.5">
          <HubCard
            variant="inn"
            title="The Inn"
            subtitle="Restore hearts · Skill tree"
            onSelect={() => onNavigate(toInn())}
          />
          <HubCard variant="shop" title="The Shop" subtitle="Coming soon" />
        </div>

        <TierTrail
          tiers={DUNGEON_TIERS}
          highestUnlockedTier={save.highestUnlockedTier}
          onSelectTier={(tier) => onNavigate(toDungeon(tier))}
        />
      </div>

      <Legend shape="square" />
    </Frame>
  )
}

export default WorldMapScreen
