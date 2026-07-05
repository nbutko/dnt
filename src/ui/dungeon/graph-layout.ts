import type { DungeonGraph, DungeonNode } from '../../domain/dungeon'

// PURE layout for the fixed two-fan-out shape (m2-implementation.html#layout —
// "graph-layout.ts is separate from DungeonGraph.tsx"). A DungeonGraph maps to
// absolute {x, y} node centres; the React component is then a dumb renderer of
// those points. Kept pure so it's unit-testable (boss rightmost, no overlaps,
// chests hang off their parent) with no DOM.

export interface Point {
  x: number
  y: number
}

export interface DungeonLayout {
  positions: Map<string, Point>
  width: number
  height: number
}

const COL_GAP = 132 // horizontal spacing between graph columns
const ROW_GAP = 92 // vertical spacing between parallel path rows
const CHEST_DX = 30 // a chest spur hangs down-and-out from its parent…
const CHEST_DY = 56 // …by this diagonal offset, reading as a dead-end branch
const PAD = 52 // canvas margin, wide enough to clear the 64px boss + its glow

// The non-chest successor of a path node: the next node along the path, or the
// chokepoint it feeds. Chests are dead-end spurs, so they're never the "main"
// way forward — following main successors walks a clean path.
const mainSuccessor = (graph: DungeonGraph, node: DungeonNode): DungeonNode | undefined =>
  node.edges.map((id) => graph.nodes[id]).find((next) => next.kind !== 'chest')

// Walk a chain from `firstId` along main successors until (excluding) the first
// node of kind `stopKind` (the chokepoint that ends the segment). Returns the
// ordered path node ids.
const walkChain = (graph: DungeonGraph, firstId: string, stopKind: DungeonNode['kind']): string[] => {
  const ids: string[] = []
  let current: DungeonNode | undefined = graph.nodes[firstId]
  while (current && current.kind !== stopKind) {
    ids.push(current.id)
    current = mainSuccessor(graph, current)
  }
  return ids
}

export const layoutDungeon = (graph: DungeonGraph): DungeonLayout => {
  // The entrance fans out into the early paths (its edges are their first
  // nodes); the waypoint fans out into the late paths. Both are read straight
  // off the graph rather than assuming id naming.
  const earlyPaths = graph.nodes[graph.entranceId].edges.map((id) => walkChain(graph, id, 'waypoint'))
  const latePaths = graph.nodes[graph.waypointId].edges.map((id) => walkChain(graph, id, 'approach'))
  const maxEarlyLen = Math.max(...earlyPaths.map((path) => path.length))
  const maxLateLen = Math.max(...latePaths.map((path) => path.length))

  // Column indices, left to right: entrance, the early fan, the waypoint, the
  // late fan, the approach, the boss.
  const waypointCol = 1 + maxEarlyLen
  const lateStartCol = waypointCol + 1
  const approachCol = lateStartCol + maxLateLen
  const bossCol = approachCol + 1
  const colX = (col: number): number => col * COL_GAP

  // Chokepoints sit on the centre row; each fan's rows are stacked symmetrically
  // around it. Fans can have different widths, so each centres independently.
  const maxRows = Math.max(earlyPaths.length, latePaths.length)
  const centreY = ((maxRows - 1) / 2) * ROW_GAP
  const rowY = (row: number, rowCount: number): number =>
    centreY + (row - (rowCount - 1) / 2) * ROW_GAP

  const pos = new Map<string, Point>()
  pos.set(graph.entranceId, { x: colX(0), y: centreY })
  pos.set(graph.waypointId, { x: colX(waypointCol), y: centreY })
  pos.set(graph.approachId, { x: colX(approachCol), y: centreY })
  pos.set(graph.bossId, { x: colX(bossCol), y: centreY })

  earlyPaths.forEach((path, row) => {
    path.forEach((id, i) => pos.set(id, { x: colX(1 + i), y: rowY(row, earlyPaths.length) }))
  })
  latePaths.forEach((path, row) => {
    path.forEach((id, i) => pos.set(id, { x: colX(lateStartCol + i), y: rowY(row, latePaths.length) }))
  })

  // Chests hang off their parent fight node as a diagonal spur, away from the
  // centre line so they don't crowd the main route.
  Object.values(graph.nodes)
    .filter((node) => node.kind === 'chest')
    .forEach((chest) => {
      const parent = Object.values(graph.nodes).find((node) => node.edges.includes(chest.id))
      const parentPos = parent && pos.get(parent.id)
      if (!parentPos) return
      const dir = parentPos.y <= centreY ? -1 : 1
      pos.set(chest.id, { x: parentPos.x + CHEST_DX, y: parentPos.y + dir * CHEST_DY })
    })

  // Normalise into a positive-origin canvas with a uniform pad, so nothing
  // clips regardless of how tall a fan (or an upward chest spur) reaches.
  const points = [...pos.values()]
  const minX = Math.min(...points.map((p) => p.x))
  const minY = Math.min(...points.map((p) => p.y))
  const maxX = Math.max(...points.map((p) => p.x))
  const maxY = Math.max(...points.map((p) => p.y))
  const positions = new Map<string, Point>()
  pos.forEach((p, id) => positions.set(id, { x: p.x - minX + PAD, y: p.y - minY + PAD }))

  return {
    positions,
    width: maxX - minX + PAD * 2,
    height: maxY - minY + PAD * 2,
  }
}
