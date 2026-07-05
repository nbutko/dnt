import { toBattle, toDungeon, toInn, type Screen } from '../../app/navigation'
import Frame from '../common/Frame'

interface WorldMapScreenProps {
  onNavigate: (screen: Screen) => void
}

// Stub for Story 1 — the real Inn/Shop hub + 11-tier trail (image 3a) lands
// in Story 3, once Story 2's shared node-state primitives exist.
const WorldMapScreen = ({ onNavigate }: WorldMapScreenProps) => (
  <Frame maxWidth={1080}>
    <h1 className="text-center font-display text-[22px] font-bold tracking-[0.12em] text-accent-gold-bright uppercase">
      World Map
    </h1>
    <div className="mt-6 flex flex-wrap justify-center gap-4 font-mono text-sm text-text-primary">
      <button
        type="button"
        className="rounded border border-border-gold px-4 py-2 hover:border-accent-gold-bright"
        onClick={() => onNavigate(toInn())}
      >
        Go to the Inn
      </button>
      <button
        type="button"
        className="rounded border border-border-gold px-4 py-2 hover:border-accent-gold-bright"
        onClick={() => onNavigate(toDungeon(1))}
      >
        Enter Tier 1 dungeon
      </button>
      <button
        type="button"
        className="rounded border border-border-gold px-4 py-2 hover:border-accent-gold-bright"
        onClick={() => onNavigate(toBattle())}
      >
        Start battle
      </button>
    </div>
  </Frame>
)

export default WorldMapScreen
