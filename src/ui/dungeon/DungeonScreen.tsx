import { toBattle, toMap, type Screen } from '../../app/navigation'
import Frame from '../common/Frame'

interface DungeonScreenProps {
  tier: number
  onNavigate: (screen: Screen) => void
}

// Stub for Story 1 — the branch graph lands in Story 10, wired to a real
// generated run in Story 11. The "Start battle" link is a temporary escape
// hatch so the battle screen stays reachable until Story 11 wires a real
// node tap into a launched fight.
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
    <div className="mt-6 text-center">
      <button
        type="button"
        className="rounded border border-border-gold px-4 py-2 font-mono text-sm text-text-primary hover:border-accent-gold-bright"
        onClick={() => onNavigate(toBattle())}
      >
        Start battle (temporary)
      </button>
    </div>
  </Frame>
)

export default DungeonScreen
