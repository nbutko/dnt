import type { DungeonGraph, DungeonNode } from '../../domain/dungeon'

// Pure transitions over a DungeonGraph — every function returns a new graph or
// a derived value, never mutating in place, so the run reducer (Story 9) can
// treat the graph as immutable state.

export const availableNodes = (graph: DungeonGraph): readonly DungeonNode[] =>
  Object.values(graph.nodes).filter((node) => node.state === 'available')

// Clear a node and open its immediate downstream. The scope's whole point in
// funneling through two chokepoints is that "does the next thing unlock?" is a
// one-node check: a locked node becomes available the moment *any* one upstream
// node clears (the fastest early path opens the waypoint; the fastest late path
// opens the approach). So clearing a node just flips each still-locked
// downstream target to available — later upstream clears are harmless no-ops.
export const clearNode = (graph: DungeonGraph, id: string): DungeonGraph => {
  const node = graph.nodes[id]
  if (!node) {
    throw new Error(`clearNode: unknown node ${id}`)
  }
  const nodes: Record<string, DungeonNode> = {
    ...graph.nodes,
    [id]: { ...node, state: 'cleared' },
  }
  node.edges.forEach((targetId) => {
    const target = nodes[targetId]
    if (target.state === 'locked') {
      nodes[targetId] = { ...target, state: 'available' }
    }
  })
  return { ...graph, nodes }
}

// The boss unlocks solely when the approach clears — no reachability walk over
// the whole graph, just the one chokepoint (m2-scope#dungeon-structure). The
// boss node going non-locked is exactly that signal.
export const bossUnlocked = (graph: DungeonGraph): boolean =>
  graph.nodes[graph.bossId].state !== 'locked'

// The dungeon is done the instant the boss is cleared; the side branches and
// unopened chests don't have to be finished.
export const isComplete = (graph: DungeonGraph): boolean =>
  graph.nodes[graph.bossId].state === 'cleared'
