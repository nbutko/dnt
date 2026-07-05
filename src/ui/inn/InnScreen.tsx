import { toMap, type Screen } from '../../app/navigation'
import Frame from '../common/Frame'

interface InnScreenProps {
  onNavigate: (screen: Screen) => void
}

// Stub for Story 1 — real skill-tree UI lands in Story 5.
const InnScreen = ({ onNavigate }: InnScreenProps) => (
  <Frame>
    <button
      type="button"
      className="font-mono text-xs text-text-dim hover:text-accent-gold-bright"
      onClick={() => onNavigate(toMap())}
    >
      ← Back to map
    </button>
    <h1 className="mt-4 text-center font-display text-[22px] font-bold tracking-[0.12em] text-accent-gold-bright uppercase">
      The Inn
    </h1>
    <p className="mt-4 text-center text-text-dim">Skill tree — coming in Story 5.</p>
  </Frame>
)

export default InnScreen
