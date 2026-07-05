// The dungeon graph — pure data, no logic (transitions live in
// engine/dungeon/graph.ts, generation in engine/dungeon/generate.ts). Shape is
// the scope's "hub and spoke, twice": entrance → early paths → waypoint → late
// paths → approach → boss (m2-scope.html#dungeon-structure).

// entrance: the free starting node every early path fans out from (always
//   available, no fight). fight: a regular monster on a path. waypoint /
//   approach: the two single chokepoints between/after the fan-outs. boss: the
//   final gated fight. chest: a dead-end spur that's either a reward or a mimic
//   fight — indistinguishable until opened.
export type NodeKind = 'entrance' | 'fight' | 'waypoint' | 'approach' | 'boss' | 'chest'

// locked: nothing upstream cleared yet, not fightable. available: an upstream
// node is cleared (or it's the entrance) — attemptable now. cleared: defeated,
// stays on the map but can't be re-fought this run (m2-scope.html#dungeon-structure).
export type NodeState = 'locked' | 'available' | 'cleared'

export interface DungeonNode {
  id: string
  kind: NodeKind
  state: NodeState
  // The monster fought at this node — undefined for the entrance (no fight)
  // and for the real chest (a reward, opened without a fight). A mimic chest
  // carries the tier's Mimic here, but the player can't tell it apart from the
  // real chest until they open it.
  monsterId?: string
  // Downstream node ids this node unlocks when cleared. The entrance points at
  // every early path's first node; a path node points at the next node on its
  // path (plus any chest spur); the last node of every early path points at
  // the waypoint; the waypoint at every late path's first node; every late
  // path's last node at the approach; the approach at the boss. Chests and the
  // boss are dead ends (empty).
  edges: readonly string[]
  // Only meaningful on chest nodes. Exactly one chest per dungeon is real
  // (isRealChest true) — the rest are mimics. Undefined on non-chest nodes.
  isRealChest?: boolean
}

export interface DungeonGraph {
  tier: number
  // The seed the graph was generated from — lets the run store regenerate the
  // identical dungeon if it ever needs to, and makes a failing invariant seed
  // reproducible.
  seed: number
  entranceId: string
  bossId: string
  waypointId: string
  approachId: string
  // Every node keyed by id — the single source of truth. edges reference into
  // this map by id rather than nesting, so a node is mutated (state flips)
  // without re-threading the graph.
  nodes: Record<string, DungeonNode>
}
