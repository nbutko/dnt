import { useMemo } from 'react'
import { toMap, type Screen } from '../../app/navigation'
import { DUNGEON_TIERS } from '../../config/dungeon-tiers'
import { getMonster } from '../../content/monsters'
import { bossUnlocked, isComplete } from '../../engine/dungeon/graph'
import { createRng } from '../../engine/rng'
import { resolveModifiers } from '../../engine/progression/skill-effects'
import { resolveFight, selectNode } from '../../state/dungeon-run/dungeon-run-reducer'
import DungeonRunProvider, { useDungeonRun } from '../../state/dungeon-run/DungeonRunProvider'
import { useSave } from '../../state/save/SaveProvider'
import type { DungeonGraph } from '../../domain/dungeon'
import Frame from '../common/Frame'
import HeartsReadout from '../common/HeartsReadout'
import Legend from '../common/Legend'
import DungeonGraphView from './DungeonGraph'

interface DungeonScreenProps {
  tier: number
  onNavigate: (screen: Screen) => void
}

const habitatFor = (tier: number): string =>
  DUNGEON_TIERS.find((entry) => entry.tier === tier)?.habitat ?? `Tier ${tier}`

// One-line "where you are" status for the header (design/README.md §3).
const statusLine = (graph: DungeonGraph): string => {
  if (isComplete(graph)) return 'The boss is down — dungeon cleared!'
  if (bossUnlocked(graph)) return 'The Approach is clear — the boss awaits.'
  if (graph.nodes[graph.approachId].state === 'available') return 'A late path is clear — reach the Approach.'
  if (graph.nodes[graph.waypointId].state === 'cleared') return 'Past the Waypoint — push toward the Approach.'
  if (graph.nodes[graph.waypointId].state === 'available') return 'The Waypoint is open — choose a late path.'
  return 'Choose a path from the entrance.'
}

// Full-frame banner shown when the run ends either way — the ephemeral run is
// discarded by leaving the screen (finding E), so both paths just go home.
interface RunEndBannerProps {
  won: boolean
  onLeave: () => void
}

const RunEndBanner = ({ won, onLeave }: RunEndBannerProps) => (
  <div className="mt-10 text-center">
    <p
      className={`font-display text-2xl font-bold tracking-[0.1em] uppercase ${
        won ? 'text-accent-gold-bright' : 'text-danger-bright'
      }`}
    >
      {won ? 'Dungeon Cleared!' : 'You were defeated…'}
    </p>
    <p className="mt-3 text-text-dim">
      {won
        ? 'The boss falls. Your rewards are already banked.'
        : 'Your hearts ran out. The dungeon collapses behind you.'}
    </p>
    <button
      type="button"
      onClick={onLeave}
      className="mt-6 rounded border border-border-gold px-4 py-2 font-mono text-sm text-text-primary hover:border-accent-gold-bright"
    >
      Return to map
    </button>
  </div>
)

// STORY 10 stand-in for the real battle (wired in Story 11). Lets the graph's
// transitions be exercised end-to-end in a browser before the battle screen is
// hooked up.
interface FightStubProps {
  monsterName: string
  onWin: () => void
  onLose: () => void
}

const FightStub = ({ monsterName, onWin, onLose }: FightStubProps) => (
  <div className="mt-10 text-center">
    <p className="font-display text-xl text-accent-gold-bright">Fighting {monsterName}…</p>
    <p className="mt-2 text-text-dim">(placeholder — the real battle screen lands in Story 11)</p>
    <div className="mt-6 flex justify-center gap-4">
      <button
        type="button"
        onClick={onWin}
        className="rounded border border-accent-gold px-4 py-2 font-mono text-sm text-accent-gold-bright hover:brightness-110"
      >
        Win
      </button>
      <button
        type="button"
        onClick={onLose}
        className="rounded border border-danger px-4 py-2 font-mono text-sm text-danger-bright hover:brightness-110"
      >
        Lose
      </button>
    </div>
  </div>
)

interface DungeonRunViewProps {
  tier: number
  maxHearts: number
  onNavigate: (screen: Screen) => void
}

const DungeonRunView = ({ tier, maxHearts, onNavigate }: DungeonRunViewProps) => {
  const { run, outcome, dispatch } = useDungeonRun()

  const activeNode = run.activeNodeId ? run.graph.nodes[run.activeNodeId] : null

  // Tapping an available node: the real chest opens with no fight, so it
  // resolves straight to a win; anything with a monster opens a battle.
  const handleSelect = (id: string): void => {
    const node = run.graph.nodes[id]
    if (node.kind === 'chest' && node.isRealChest) {
      dispatch(resolveFight('win', id))
      return
    }
    dispatch(selectNode(id))
  }

  const renderBody = () => {
    if (outcome !== 'ongoing') {
      return <RunEndBanner won={outcome === 'complete'} onLeave={() => onNavigate(toMap())} />
    }
    if (activeNode) {
      return (
        <FightStub
          monsterName={getMonster(activeNode.monsterId!).name}
          onWin={() => dispatch(resolveFight('win', activeNode.id))}
          onLose={() => dispatch(resolveFight('lose', activeNode.id))}
        />
      )
    }
    return (
      <div className="mt-6">
        <DungeonGraphView graph={run.graph} onSelectNode={handleSelect} />
        <Legend shape="circle" showChest />
      </div>
    )
  }

  return (
    <Frame>
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            type="button"
            className="font-mono text-xs text-text-dim hover:text-accent-gold-bright"
            onClick={() => onNavigate(toMap())}
          >
            ← Leave dungeon
          </button>
          <h1 className="mt-3 font-display text-[22px] font-bold tracking-[0.12em] text-accent-gold-bright uppercase">
            {habitatFor(tier)} Dungeon
          </h1>
          <p className="mt-1 font-mono text-[11px] text-text-dim">{statusLine(run.graph)}</p>
        </div>
        <HeartsReadout current={run.heartsRemaining} max={maxHearts} />
      </div>

      {renderBody()}
    </Frame>
  )
}

// Composition root (image 3b): owns the ephemeral run provider. A fresh seed
// per mount means every dungeon visit regenerates a new layout — and closing
// the screen throws the run away, by design (finding E).
const DungeonScreen = ({ tier, onNavigate }: DungeonScreenProps) => {
  const { save } = useSave()
  const { maxHearts } = resolveModifiers(save.skillTree)

  // A fresh random seed, computed once per mount → every dungeon visit
  // regenerates a new layout (finding E). GameShell remounts this screen on
  // each visit, so an empty dep array rerolls the seed exactly once per visit.
  const seed = useMemo(() => Math.floor(Math.random() * 2 ** 31), [])
  const params = useMemo(
    () => ({ tier, maxHearts, rng: createRng(seed), seed }),
    [tier, maxHearts, seed],
  )

  return (
    <DungeonRunProvider params={params}>
      <DungeonRunView tier={tier} maxHearts={maxHearts} onNavigate={onNavigate} />
    </DungeonRunProvider>
  )
}

export default DungeonScreen
