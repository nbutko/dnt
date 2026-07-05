import { describe, expect, it } from 'vitest'
import { createRng } from '../../engine/rng'
import {
  dungeonRunReducer,
  enter,
  initRun,
  resolveFight,
  runOutcome,
  selectNode,
  type DungeonRunState,
} from './dungeon-run-reducer'

const startRun = (maxHearts: number, seed = 1): DungeonRunState =>
  initRun({ tier: 1, maxHearts, rng: createRng(seed), seed })

// The next fight node along a path (skips any chest spur), hoisted out of the
// walk loop below to avoid closing over the reassigned run state.
const nextFight = (state: DungeonRunState, id: string): string =>
  state.graph.nodes[id].edges.find((target) => state.graph.nodes[target].kind === 'fight')!

describe('dungeon-run reducer', () => {
  it('enters a fresh run with full hearts and no active fight', () => {
    const state = dungeonRunReducer(startRun(1), enter({ tier: 1, maxHearts: 3, rng: createRng(2), seed: 2 }))
    expect(state.heartsRemaining).toBe(3)
    expect(state.activeNodeId).toBeNull()
    expect(runOutcome(state)).toBe('ongoing')
  })

  it('selecting a node marks it active', () => {
    const state = dungeonRunReducer(startRun(2), selectNode('e0-0'))
    expect(state.activeNodeId).toBe('e0-0')
  })

  it('losing a fight costs a heart and leaves the node available to retry', () => {
    const start = startRun(2)
    const node = start.graph.nodes.entrance.edges[0]
    const after = dungeonRunReducer(start, resolveFight('lose', node))
    expect(after.heartsRemaining).toBe(1)
    expect(after.graph.nodes[node].state).toBe('available')
    expect(after.activeNodeId).toBeNull()
    expect(runOutcome(after)).toBe('ongoing')
  })

  it('running out of hearts wipes the run', () => {
    let state = startRun(1)
    const node = state.graph.nodes.entrance.edges[0]
    state = dungeonRunReducer(state, resolveFight('lose', node))
    expect(state.heartsRemaining).toBe(0)
    expect(runOutcome(state)).toBe('wiped')
  })

  it('winning a fight clears the node and opens its downstream', () => {
    const start = startRun(2)
    const first = start.graph.nodes.entrance.edges[0]
    const next = start.graph.nodes[first].edges[0]
    const after = dungeonRunReducer(start, resolveFight('win', first))
    expect(after.graph.nodes[first].state).toBe('cleared')
    expect(after.graph.nodes[next].state).toBe('available')
  })

  it('clearing the approach opens the boss, and clearing the boss completes the run', () => {
    let state = startRun(3)
    state = dungeonRunReducer(state, resolveFight('win', 'approach'))
    expect(state.graph.nodes.boss.state).toBe('available')
    expect(runOutcome(state)).toBe('ongoing')
    state = dungeonRunReducer(state, resolveFight('win', 'boss'))
    expect(runOutcome(state)).toBe('complete')
  })

  it('a headless enter → clear an early path → reach the waypoint walk', () => {
    let state = startRun(3)
    // Walk the first early path to its end, clearing as we go.
    let cursor: string = state.graph.nodes.entrance.edges[0]
    while (!state.graph.nodes[cursor].edges.includes('waypoint')) {
      const next = nextFight(state, cursor)
      state = dungeonRunReducer(state, resolveFight('win', cursor))
      cursor = next
    }
    expect(state.graph.nodes.waypoint.state).toBe('locked')
    state = dungeonRunReducer(state, resolveFight('win', cursor))
    expect(state.graph.nodes.waypoint.state).toBe('available')
    expect(runOutcome(state)).toBe('ongoing')
  })
})
