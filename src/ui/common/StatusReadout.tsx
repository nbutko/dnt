import HeartsReadout from './HeartsReadout'
import ResourcePill from './ResourcePill'

interface StatusReadoutProps {
  xp: number
  coins: number
  hearts: number
  maxHearts: number
}

// The player's live status cluster: XP and coins to the LEFT of the hearts, all
// on one row (feedback #5). Shown on every screen that surfaces status — map,
// inn, and dungeon — so health always reads alongside the resources instead of
// only appearing mid-run. Outside a dungeon the hearts sit full (they're a
// per-run resource, restored at the Inn), so callers pass hearts === maxHearts.
const StatusReadout = ({ xp, coins, hearts, maxHearts }: StatusReadoutProps) => (
  <div className="flex items-center gap-2.5">
    <ResourcePill kind="xp" amount={xp} />
    <ResourcePill kind="coins" amount={coins} />
    <HeartsReadout current={hearts} max={maxHearts} />
  </div>
)

export default StatusReadout
