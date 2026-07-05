import dungeonGenerationConfig from '../../config/dungeon-generation'
import type { DungeonGraph } from '../../domain/dungeon'
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
  // The node the player is currently attempting, if a battle is open — null
  // between fights. The dungeon screen reads this to know which battle to host.
  activeNodeId: string | null
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

export const enter = (params: EnterParams): DungeonRunAction => ({ type: 'enter', params })

export const selectNode = (nodeId: string): DungeonRunAction => ({ type: 'selectNode', nodeId })

export const resolveFight = (result: 'win' | 'lose', nodeId: string): DungeonRunAction => ({
  type: 'resolveFight',
  result,
  nodeId,
})

// Build a fresh run — used both as the reducer's lazy initial state and by the
// 'enter' action on a (re)visit, so entering always regenerates from the seed.
export const initRun = ({ tier, maxHearts, rng, seed }: EnterParams): DungeonRunState => ({
  graph: generateDungeon(tier, dungeonGenerationConfig, rng, seed),
  heartsRemaining: maxHearts,
  activeNodeId: null,
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

    case 'resolveFight':
      // A win clears the node (opening its downstream); a loss costs a heart
      // and leaves the node available to retry (m2-scope#hearts). Either way
      // the active battle closes.
      return action.result === 'win'
        ? { ...state, graph: clearNode(state.graph, action.nodeId), activeNodeId: null }
        : {
            ...state,
            heartsRemaining: Math.max(0, state.heartsRemaining - 1),
            activeNodeId: null,
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
