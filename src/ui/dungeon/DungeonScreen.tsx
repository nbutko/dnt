import { useMemo, useRef, useState } from 'react'
import { toMap, type Screen } from '../../app/navigation'
import { DUNGEON_TIERS } from '../../config/dungeon-tiers'
import rewardsConfig from '../../config/rewards'
import { getMonster } from '../../content/monsters'
import type { DungeonGraph, DungeonNode } from '../../domain/dungeon'
import type { MonsterRole } from '../../domain/types'
import { bossUnlocked, isComplete } from '../../engine/dungeon/graph'
import { createRng } from '../../engine/rng'
import { resolveModifiers } from '../../engine/progression/skill-effects'
import { rewardForChest, rewardForKill } from '../../engine/progression/rewards'
import { resolveFight, selectNode } from '../../state/dungeon-run/dungeon-run-reducer'
import DungeonRunProvider, { useDungeonRun } from '../../state/dungeon-run/DungeonRunProvider'
import { award, recordDefeat, unlockTier } from '../../state/save/save-reducer'
import { useSave } from '../../state/save/SaveProvider'
import BattleScreen from '../battle/BattleScreen'
import Frame from '../common/Frame'
import HeartsReadout from '../common/HeartsReadout'
import Legend from '../common/Legend'
import ResourcePill from '../common/ResourcePill'
import DungeonGraphView from './DungeonGraph'
import MimicModal from './MimicModal'

interface DungeonScreenProps {
  tier: number
  onNavigate: (screen: Screen) => void
}

const habitatFor = (tier: number): string =>
  DUNGEON_TIERS.find((entry) => entry.tier === tier)?.habitat ?? `Tier ${tier}`

// The reward role for a node: the boss node pays a boss reward, a mimic chest a
// mimic reward, and every other fight (regular, waypoint, approach) a regular.
const roleForNode = (node: DungeonNode): MonsterRole => {
  if (node.kind === 'boss') return 'boss'
  if (node.kind === 'chest') return 'mimic'
  return 'regular'
}

// One-line "where you are" status for the header (design/README.md §3).
const statusLine = (graph: DungeonGraph): string => {
  if (isComplete(graph)) return 'The boss is down — dungeon cleared!'
  if (bossUnlocked(graph)) return 'The Approach is clear — the boss awaits.'
  if (graph.nodes[graph.approachId].state === 'available')
    return 'A late path is clear — reach the Approach.'
  if (graph.nodes[graph.waypointId].state === 'cleared')
    return 'Past the Waypoint — push toward the Approach.'
  if (graph.nodes[graph.waypointId].state === 'available')
    return 'The Waypoint is open — choose a late path.'
  return 'Choose a path from the entrance.'
}

// Full-frame banner shown when the run ends either way — the ephemeral run is
// discarded by leaving the screen (finding E), so both paths just go home. XP
// and coins were already banked per-kill, so nothing is lost on a wipe.
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
        ? 'The boss falls, and the next tier opens on the map. Your rewards are banked.'
        : 'Your hearts ran out. The dungeon collapses — but the XP you earned is yours to keep.'}
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

interface DungeonRunViewProps {
  tier: number
  onNavigate: (screen: Screen) => void
}

const DungeonRunView = ({ tier, onNavigate }: DungeonRunViewProps) => {
  const { run, outcome, dispatch } = useDungeonRun()
  const { save, dispatch: saveDispatch } = useSave()
  const modifiers = resolveModifiers(save.skillTree)

  const activeNode = run.activeNodeId ? run.graph.nodes[run.activeNodeId] : null

  // Survives the battle (which unmounts the graph) so the graph re-mounts at the
  // same horizontal scroll offset instead of snapping back to 0 (feedback #7).
  const graphScrollLeft = useRef(0)

  // A mimic chest, once tapped, pauses on a reveal modal before the fight
  // (feedback #13) — holds the tapped node id until the player hits Begin
  // Battle. Null the rest of the time.
  const [mimicRevealId, setMimicRevealId] = useState<string | null>(null)
  const mimicNode = mimicRevealId ? run.graph.nodes[mimicRevealId] : null
  const mimicName = mimicNode?.monsterId ? getMonster(mimicNode.monsterId).name : undefined

  // A win banks its reward per-kill, immediately (finding C) — so a run that
  // later wipes still earns progress. Defeating the boss unlocks the next tier
  // (and reaches 12 past tier 11, finding D).
  const handleWin = (node: DungeonNode): void => {
    const reward =
      node.kind === 'chest' && node.isRealChest
        ? rewardForChest(tier, rewardsConfig)
        : rewardForKill(tier, roleForNode(node), rewardsConfig)
    saveDispatch(award(reward.coins, reward.xp))
    if (node.monsterId) saveDispatch(recordDefeat(node.monsterId))
    if (node.kind === 'boss') saveDispatch(unlockTier(tier + 1))
    dispatch(resolveFight('win', node.id))
  }

  // Tapping an available node: the real chest opens with no fight, resolving
  // straight to a win; a mimic chest reveals itself and waits on the modal
  // before its fight (feedback #13); anything else opens a battle directly.
  const handleSelect = (id: string): void => {
    const node = run.graph.nodes[id]
    if (node.kind === 'chest' && node.isRealChest) {
      handleWin(node)
      return
    }
    if (node.kind === 'chest') {
      setMimicRevealId(id)
      return
    }
    dispatch(selectNode(id))
  }

  // Begin Battle on the mimic modal: commit the tapped chest to a real fight.
  const handleBeginMimic = (): void => {
    if (!mimicRevealId) return
    dispatch(selectNode(mimicRevealId))
    setMimicRevealId(null)
  }

  // A live fight takes over the whole screen (its own Frame) so the dungeon
  // header doesn't double-border around it.
  if (activeNode && activeNode.monsterId && outcome === 'ongoing') {
    return (
      <BattleScreen
        monster={getMonster(activeNode.monsterId)}
        modifiers={modifiers}
        onResult={(result) =>
          result === 'win' ? handleWin(activeNode) : dispatch(resolveFight('lose', activeNode.id))
        }
      />
    )
  }

  const body =
    outcome === 'ongoing' ? (
      <div className="mt-6">
        <DungeonGraphView
          graph={run.graph}
          onSelectNode={handleSelect}
          scrollLeftRef={graphScrollLeft}
        />
        <Legend shape="circle" showChest />
      </div>
    ) : (
      <RunEndBanner won={outcome === 'complete'} onLeave={() => onNavigate(toMap())} />
    )

  return (
    <>
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
          {/* XP/gold above the hearts, so the run's live resources read at a
            glance next to its live health (feedback #5). */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2.5">
              <ResourcePill kind="xp" amount={save.xp} />
              <ResourcePill kind="coins" amount={save.coins} />
            </div>
            <HeartsReadout current={run.heartsRemaining} max={modifiers.maxHearts} />
          </div>
        </div>

        {body}
      </Frame>
      {mimicRevealId && mimicName && (
        <MimicModal monsterName={mimicName} onBegin={handleBeginMimic} />
      )}
    </>
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
      <DungeonRunView tier={tier} onNavigate={onNavigate} />
    </DungeonRunProvider>
  )
}

export default DungeonScreen
