import dungeonGenerationConfig from '../../config/dungeon-generation'
import type { DungeonGraph } from '../../domain/dungeon'
import type { ActiveBuff } from '../../domain/items'
import type { Rng } from '../../domain/types'
import { generateDungeon } from '../../engine/dungeon/generate'
import { clearNode, isComplete } from '../../engine/dungeon/graph'

// The ephemeral dungeon-run home (m2-implementation.html#state, finding E) —
// deliberately never persisted. Closing the dungeon mid-run equals leaving; a
// revisit regenerates from a fresh seed. This reducer is the one place state
// meets the pure dungeon engine (generate + graph transitions); it imports no
// combat and no React.

export interface DungeonRunState {
  graph: DungeonGraph
  heartsRemaining: number
  // Stashed from EnterParams so restoreHearts (Potion of Healing) has a cap to
  // clamp against without the caller re-deriving it from the save (Story 9).
  maxHearts: number
  // The node the player is currently attempting, if a battle is open — null
  // between fights. The dungeon screen reads this to know which battle to host.
  activeNodeId: string | null
  // Consumable buffs riding the rest of this dungeon visit (finding E,
  // m3-implementation.html) — Bag.tsx adds them, resolveFight expires the
  // 'next-fight' ones, clearBuffs empties everything on win/wipe/leave. Never
  // persisted: owning an item is a save fact, a buff being active is a run
  // fact.
  activeBuffs: ActiveBuff[]
}

// 'ongoing' — the run continues. 'wiped' — hearts ran out, the attempt failed.
// 'complete' — the boss is down, the dungeon is cleared. Derived, never stored,
// so it can't drift out of sync with the graph and heart count.
export type RunOutcome = 'ongoing' | 'wiped' | 'complete'

export interface EnterParams {
  tier: number
  maxHearts: number
  rng: Rng
  seed: number
}

export type DungeonRunAction =
  | { type: 'enter'; params: EnterParams }
  | { type: 'selectNode'; nodeId: string }
  | { type: 'resolveFight'; result: 'win' | 'lose'; nodeId: string }
  | { type: 'addBuff'; buff: ActiveBuff }
  | { type: 'clearBuffs' }
  | { type: 'restoreHearts'; hearts: number }

export const enter = (params: EnterParams): DungeonRunAction => ({ type: 'enter', params })

export const selectNode = (nodeId: string): DungeonRunAction => ({ type: 'selectNode', nodeId })

export const resolveFight = (result: 'win' | 'lose', nodeId: string): DungeonRunAction => ({
  type: 'resolveFight',
  result,
  nodeId,
})

// Bag.tsx dispatches this for every consumable except 'restore-hearts' (which
// is instant, not a buff — see restoreHearts below).
export const addBuff = (buff: ActiveBuff): DungeonRunAction => ({ type: 'addBuff', buff })

// Fires on run end — win, wipe, or leave (m3-implementation.html Story 9). The
// DungeonRunProvider remounting on a fresh visit already drops buffs for free;
// this covers the win/wipe transitions where the provider stays mounted for
// the result screen.
export const clearBuffs = (): DungeonRunAction => ({ type: 'clearBuffs' })

// A Potion of Healing's instant effect — restores hearts to the run directly
// rather than becoming an ActiveBuff (domain/items.ts's ActiveBuff never
// carries 'instant' duration in practice).
export const restoreHearts = (hearts: number): DungeonRunAction => ({
  type: 'restoreHearts',
  hearts,
})

// Build a fresh run — used both as the reducer's lazy initial state and by the
// 'enter' action on a (re)visit, so entering always regenerates from the seed.
export const initRun = ({ tier, maxHearts, rng, seed }: EnterParams): DungeonRunState => ({
  graph: generateDungeon(tier, dungeonGenerationConfig, rng, seed),
  heartsRemaining: maxHearts,
  maxHearts,
  activeNodeId: null,
  activeBuffs: [],
})

// Expires 'next-fight' buffs after a resolved fight — a win OR a loss both
// count as the fight the buff rode (m3-implementation.html Story 9: a
// resolved fight, either direction, consumes it). A buff with no
// fightsRemaining clears after this one fight; one with fightsRemaining (Oil
// of Sharpness = 3) decrements and drops at 0. 'rest-of-dungeon' buffs are
// untouched here; 'instant' buffs never reach activeBuffs at all.
const expireNextFightBuffs = (buffs: ActiveBuff[]): ActiveBuff[] =>
  buffs.flatMap((buff) => {
    if (buff.duration !== 'next-fight') return [buff]
    if (buff.fightsRemaining === undefined) return []
    const fightsRemaining = buff.fightsRemaining - 1
    return fightsRemaining > 0 ? [{ ...buff, fightsRemaining }] : []
  })

export const dungeonRunReducer = (
  state: DungeonRunState,
  action: DungeonRunAction,
): DungeonRunState => {
  switch (action.type) {
    case 'enter':
      return initRun(action.params)

    case 'selectNode':
      return { ...state, activeNodeId: action.nodeId }

    case 'resolveFight': {
      // A win clears the node (opening its downstream); a loss costs a heart
      // and leaves the node available to retry (m2-scope#hearts). Either way
      // the active battle closes and any next-fight buffs expire.
      const activeBuffs = expireNextFightBuffs(state.activeBuffs)
      return action.result === 'win'
        ? { ...state, graph: clearNode(state.graph, action.nodeId), activeNodeId: null, activeBuffs }
        : {
            ...state,
            heartsRemaining: Math.max(0, state.heartsRemaining - 1),
            activeNodeId: null,
            activeBuffs,
          }
    }

    case 'addBuff':
      return { ...state, activeBuffs: [...state.activeBuffs, action.buff] }

    case 'clearBuffs':
      return { ...state, activeBuffs: [] }

    case 'restoreHearts':
      return {
        ...state,
        heartsRemaining: Math.min(state.maxHearts, state.heartsRemaining + action.hearts),
      }

    default:
      return state
  }
}

export const runOutcome = (state: DungeonRunState): RunOutcome => {
  if (isComplete(state.graph)) return 'complete'
  if (state.heartsRemaining <= 0) return 'wiped'
  return 'ongoing'
}
