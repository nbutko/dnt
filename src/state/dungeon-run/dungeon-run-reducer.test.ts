import { describe, expect, it } from 'vitest'
import type { ActiveBuff } from '../../domain/items'
import { createRng } from '../../engine/rng'
import {
  addBuff,
  clearBuffs,
  dungeonRunReducer,
  enter,
  initRun,
  resolveFight,
  restoreHearts,
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

  describe('active buffs', () => {
    const nextFightBuff: ActiveBuff = { itemId: 'bulls-strength', duration: 'next-fight' }
    const oilOfSharpness: ActiveBuff = {
      itemId: 'oil-of-sharpness',
      duration: 'next-fight',
      fightsRemaining: 3,
    }
    const restOfDungeonBuff: ActiveBuff = { itemId: 'luckstone', duration: 'rest-of-dungeon' }

    it('using an item adds exactly one buff', () => {
      const state = dungeonRunReducer(startRun(2), addBuff(nextFightBuff))
      expect(state.activeBuffs).toEqual([nextFightBuff])
    })

    it('a next-fight buff (no fightsRemaining) clears after one resolved fight', () => {
      let state = startRun(2)
      state = dungeonRunReducer(state, addBuff(nextFightBuff))
      const node = state.graph.nodes.entrance.edges[0]
      state = dungeonRunReducer(state, resolveFight('win', node))
      expect(state.activeBuffs).toEqual([])
    })

    it('a fightsRemaining:3 buff survives 2 fights and drops on the 3rd (win or lose both count)', () => {
      let state = startRun(3)
      state = dungeonRunReducer(state, addBuff(oilOfSharpness))
      let cursor = state.graph.nodes.entrance.edges[0]
      let next = nextFight(state, cursor)

      state = dungeonRunReducer(state, resolveFight('lose', cursor))
      expect(state.activeBuffs).toEqual([{ ...oilOfSharpness, fightsRemaining: 2 }])

      state = dungeonRunReducer(state, resolveFight('win', cursor))
      expect(state.activeBuffs).toEqual([{ ...oilOfSharpness, fightsRemaining: 1 }])
      cursor = next
      next = nextFight(state, cursor)

      state = dungeonRunReducer(state, resolveFight('win', cursor))
      expect(state.activeBuffs).toEqual([])
    })

    it('a rest-of-dungeon buff persists across fights until clearBuffs', () => {
      let state = startRun(3)
      state = dungeonRunReducer(state, addBuff(restOfDungeonBuff))
      const node = state.graph.nodes.entrance.edges[0]
      state = dungeonRunReducer(state, resolveFight('win', node))
      expect(state.activeBuffs).toEqual([restOfDungeonBuff])

      state = dungeonRunReducer(state, clearBuffs())
      expect(state.activeBuffs).toEqual([])
    })

    it('clearBuffs empties everything, including next-fight and rest-of-dungeon buffs together', () => {
      let state = startRun(2)
      state = dungeonRunReducer(state, addBuff(nextFightBuff))
      state = dungeonRunReducer(state, addBuff(restOfDungeonBuff))
      state = dungeonRunReducer(state, clearBuffs())
      expect(state.activeBuffs).toEqual([])
    })
  })

  describe('restoreHearts', () => {
    it('raises heartsRemaining', () => {
      let state = startRun(3)
      const node = state.graph.nodes.entrance.edges[0]
      state = dungeonRunReducer(state, resolveFight('lose', node))
      expect(state.heartsRemaining).toBe(2)
      state = dungeonRunReducer(state, restoreHearts(1))
      expect(state.heartsRemaining).toBe(3)
    })

    it("doesn't exceed maxHearts", () => {
      const state = dungeonRunReducer(startRun(3), restoreHearts(5))
      expect(state.heartsRemaining).toBe(3)
    })
  })
})
