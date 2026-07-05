import { toMap, type Screen } from '../../app/navigation'
import Frame from '../common/Frame'

interface DungeonScreenProps {
  tier: number
  onNavigate: (screen: Screen) => void
}

// Stub for Story 1 — the branch graph lands in Story 10, wired to a real
// generated run in Story 11.
const DungeonScreen = ({ tier, onNavigate }: DungeonScreenProps) => (
  <Frame>
    <button
      type="button"
      className="font-mono text-xs text-text-dim hover:text-accent-gold-bright"
      onClick={() => onNavigate(toMap())}
    >
      ← Back to map
    </button>
    <h1 className="mt-4 text-center font-display text-[22px] font-bold tracking-[0.12em] text-accent-gold-bright uppercase">
      Dungeon — Tier {tier}
    </h1>
    <p className="mt-4 text-center text-text-dim">Branch graph — coming in Story 10.</p>
  </Frame>
)

export default DungeonScreen
