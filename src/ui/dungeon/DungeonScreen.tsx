import { useMemo, useRef, useState } from 'react'
import { toMap, type Screen } from '../../app/navigation'
import { DUNGEON_TIERS } from '../../config/dungeon-tiers'
import rewardsConfig from '../../config/rewards'
import { getWeapon } from '../../config/weapons'
import { getMonster } from '../../content/monsters'
import type { DungeonGraph, DungeonNode } from '../../domain/dungeon'
import type { MonsterRole } from '../../domain/types'
import { PLACEHOLDER_CHARACTER, resolveModifiers } from '../../engine/character/modifiers'
import { bossUnlocked, isComplete } from '../../engine/dungeon/graph'
import { createRng } from '../../engine/rng'
import { rewardForChest, rewardForKill } from '../../engine/progression/rewards'
import { resolveFight, selectNode } from '../../state/dungeon-run/dungeon-run-reducer'
import DungeonRunProvider, { useDungeonRun } from '../../state/dungeon-run/DungeonRunProvider'
import { award, recordDefeat, unlockTier } from '../../state/save/save-reducer'
import { useSave } from '../../state/save/SaveProvider'
import BattleScreen from '../battle/BattleScreen'
import Frame from '../common/Frame'
import Legend from '../common/Legend'
import StatusReadout from '../common/StatusReadout'
import DungeonGraphView from './DungeonGraph'
import EncounterModal from './EncounterModal'
import RewardModal from './RewardModal'

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

// Node kinds whose monster is hidden until you commit — they reveal in a modal
// before the fight instead of dropping you straight in (mimic was feedback #13;
// waypoint/approach/boss added in round-2 #C). A plain fight circle already
// shows its monster, so it isn't gated. (A real chest is intercepted earlier —
// it has no fight — so the only chest reaching here is a mimic.)
const REVEAL_KINDS = new Set<DungeonNode['kind']>(['chest', 'waypoint', 'approach', 'boss'])

interface RevealCopy {
  headline: string
  subtext: string
  danger: boolean
}

// The reveal-modal copy for a hidden encounter, by node kind. A mimic keeps its
// "it was a Mimic!" surprise (the specific monster is named only in the subtext);
// the chokepoints and boss name the monster in the headline (round-2 #C).
const revealCopy = (node: DungeonNode, name: string): RevealCopy => {
  switch (node.kind) {
    case 'chest':
      return {
        headline: 'You encountered a Mimic!',
        subtext: `The chest springs open with teeth — a ${name} was lying in wait.`,
        danger: true,
      }
    case 'waypoint':
      return {
        headline: `You encountered a ${name}!`,
        subtext: 'A guardian bars the waypoint — beat it to open the late paths.',
        danger: false,
      }
    case 'approach':
      return {
        headline: `You encountered a ${name}!`,
        subtext: 'The last guard before the boss — clear the approach.',
        danger: false,
      }
    case 'boss':
      return {
        headline: `You encountered the ${name}!`,
        subtext: 'The dungeon boss itself — defeat it to claim the tier.',
        danger: true,
      }
    default:
      return { headline: `You encountered a ${name}!`, subtext: '', danger: false }
  }
}

// What the reward modal (feedback #1) is banking, captured at win time so the
// modal can show the gain and the new running total without re-reading save
// mid-render. `nodeId` is what its Continue resolves once confirmed.
interface RewardView {
  nodeId: string
  title: string
  xpGained: number
  coinsGained: number
  xpTotal: number
  coinsTotal: number
}

// The reward modal's heading, by what was just beaten/opened.
const rewardTitle = (node: DungeonNode): string => {
  if (node.kind === 'boss') return 'Boss Defeated!'
  if (node.kind === 'chest') return 'Treasure Claimed!'
  return 'Victory!'
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
      // Autofocused so a bare Enter returns to the map, matching the reward/mimic
      // modals — otherwise Enter on the run-end banner did nothing (round-2 #A).
      // eslint-disable-next-line jsx-a11y/no-autofocus
      autoFocus
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
  // The dungeon-run store doesn't carry active item buffs yet (Story 9 wires
  // the Bag) — this is the one caller that will eventually assemble both the
  // persistent character and those ephemeral buffs for the battle launch.
  // No character yet until Story 4 lands creation — see modifiers.ts's
  // PLACEHOLDER_CHARACTER.
  const modifiers = resolveModifiers(
    save.character ?? PLACEHOLDER_CHARACTER,
    getWeapon(save.equippedWeapon),
  )

  const activeNode = run.activeNodeId ? run.graph.nodes[run.activeNodeId] : null

  // Survives the battle (which unmounts the graph) so the graph re-mounts at the
  // same horizontal scroll offset instead of snapping back to 0 (feedback #7).
  const graphScrollLeft = useRef(0)

  // A hidden encounter (mimic chest, or a ?-glyph waypoint/approach/boss), once
  // tapped, pauses on a reveal modal before the fight (feedback #13, round-2 #C)
  // — holds the tapped node id until the player hits Begin Battle. Null the rest
  // of the time.
  const [revealId, setRevealId] = useState<string | null>(null)
  const revealNode = revealId ? run.graph.nodes[revealId] : null
  const revealName = revealNode?.monsterId ? getMonster(revealNode.monsterId).name : undefined

  // A win/real-chest resolves INTO this reward modal (feedback #1/#12): the win
  // is banked immediately, but the run isn't advanced until the player confirms
  // the modal — so its single Continue press doubles as the battle's continue.
  const [reward, setReward] = useState<RewardView | null>(null)

  // A win banks its reward per-kill, immediately (finding C) — so a run that
  // later wipes still earns progress. Defeating the boss unlocks the next tier
  // (and reaches 12 past tier 11, finding D). The graph isn't advanced here: we
  // stash the reward + pre/post totals and let the modal's confirm do it, so the
  // player sees what they earned first (feedback #1).
  const handleWin = (node: DungeonNode): void => {
    const amount =
      node.kind === 'chest' && node.isRealChest
        ? rewardForChest(tier, rewardsConfig)
        : rewardForKill(tier, roleForNode(node), rewardsConfig)
    saveDispatch(award(amount.coins, amount.xp))
    if (node.monsterId) saveDispatch(recordDefeat(node.monsterId))
    if (node.kind === 'boss') saveDispatch(unlockTier(tier + 1))
    // save's xp/coins here are the pre-award totals (this render's snapshot),
    // so adding the gain gives the post total to display alongside it. xp now
    // lives on the character (v3) and folds in only once one exists — see
    // save-reducer.ts's award case.
    setReward({
      nodeId: node.id,
      title: rewardTitle(node),
      xpGained: amount.xp,
      coinsGained: amount.coins,
      xpTotal: (save.character?.xp ?? 0) + amount.xp,
      coinsTotal: save.coins + amount.coins,
    })
  }

  // The reward modal's Continue: now advance the run and close the modal — one
  // press back to the graph (feedback #12).
  const handleRewardConfirm = (): void => {
    if (!reward) return
    dispatch(resolveFight('win', reward.nodeId))
    setReward(null)
  }

  // Tapping an available node: the real chest opens with no fight, resolving
  // straight to a win; a hidden encounter (mimic chest, or the ?-glyph
  // waypoint/approach/boss) reveals itself and waits on the modal before its
  // fight (feedback #13, round-2 #C); a plain fight opens a battle directly.
  const handleSelect = (id: string): void => {
    const node = run.graph.nodes[id]
    if (node.kind === 'chest' && node.isRealChest) {
      handleWin(node)
      return
    }
    if (REVEAL_KINDS.has(node.kind)) {
      setRevealId(id)
      return
    }
    dispatch(selectNode(id))
  }

  // Begin Battle on the reveal modal: commit the tapped node to its fight.
  const handleBeginReveal = (): void => {
    if (!revealId) return
    dispatch(selectNode(revealId))
    setRevealId(null)
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

  // A live fight takes over the whole screen (its own Frame) so the dungeon
  // header doesn't double-border around it. On a win it stays mounted while the
  // reward modal overlays it (a win doesn't clear activeNodeId until the modal's
  // Continue resolves the fight), so the modals below sit over either screen.
  const screen =
    activeNode && activeNode.monsterId && outcome === 'ongoing' ? (
      <BattleScreen
        monster={getMonster(activeNode.monsterId)}
        modifiers={modifiers}
        onResult={(result) =>
          result === 'win' ? handleWin(activeNode) : dispatch(resolveFight('lose', activeNode.id))
        }
      />
    ) : (
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
          {/* XP/gold to the LEFT of the live hearts, one row (feedback #5). */}
          <StatusReadout
            xp={save.character?.xp ?? 0}
            coins={save.coins}
            hearts={run.heartsRemaining}
            maxHearts={modifiers.maxHearts}
          />
        </div>

        {body}
      </Frame>
    )

  return (
    <>
      {screen}
      {reward && (
        <RewardModal
          title={reward.title}
          xpGained={reward.xpGained}
          coinsGained={reward.coinsGained}
          xpTotal={reward.xpTotal}
          coinsTotal={reward.coinsTotal}
          onConfirm={handleRewardConfirm}
        />
      )}
      {revealNode &&
        revealName &&
        (() => {
          const copy = revealCopy(revealNode, revealName)
          return (
            <EncounterModal
              headline={copy.headline}
              subtext={copy.subtext}
              danger={copy.danger}
              onBegin={handleBeginReveal}
            />
          )
        })()}
    </>
  )
}

// Composition root (image 3b): owns the ephemeral run provider. A fresh seed
// per mount means every dungeon visit regenerates a new layout — and closing
// the screen throws the run away, by design (finding E).
const DungeonScreen = ({ tier, onNavigate }: DungeonScreenProps) => {
  const { save } = useSave()
  // No character yet until Story 4 lands creation — see modifiers.ts's
  // PLACEHOLDER_CHARACTER.
  const { maxHearts } = resolveModifiers(
    save.character ?? PLACEHOLDER_CHARACTER,
    getWeapon(save.equippedWeapon),
  )

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
