import type { DungeonGenerationConfig } from '../../config/dungeon-generation'
import { byRole } from '../../content/monsters'
import type { DungeonGraph, DungeonNode } from '../../domain/dungeon'
import type { Rng } from '../../domain/types'

// Inclusive integer roll in [min, max].
const randInt = (rng: Rng, min: number, max: number): number =>
  min + Math.floor(rng.next() * (max - min + 1))

// Pick one element (with repetition across calls).
const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng.next() * items.length)]

// k distinct elements, sampled without replacement (partial Fisher-Yates).
const sampleDistinct = <T>(rng: Rng, items: readonly T[], k: number): T[] => {
  const pool = [...items]
  const out: T[] = []
  const take = Math.min(k, pool.length)
  for (let i = 0; i < take; i += 1) {
    const j = i + Math.floor(rng.next() * (pool.length - i))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
    out.push(pool[i])
  }
  return out
}

interface Skeleton {
  earlyLens: number[]
  lateLens: number[]
  total: number
  shortest: number
}

// Roll path counts/lengths until they satisfy the scope's two hard invariants
// (m2-scope.html#dungeon-structure): shortest path 7-10 and regular-monster
// total in the target band. Rejection sampling against generous per-segment
// ranges is simpler than trying to construct a valid shape directly, and stays
// deterministic because the rng is seeded. The cap is a safety valve the
// invariant sim confirms is never hit in practice.
const rollSkeleton = (rng: Rng, cfg: DungeonGenerationConfig): Skeleton => {
  const [minTotal, maxTotal] = cfg.targetTotal
  const [minShort, maxShort] = cfg.shortestPath
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const earlyLens = Array.from({ length: randInt(rng, ...cfg.earlyPaths) }, () =>
      randInt(rng, ...cfg.earlyPathLen),
    )
    const lateLens = Array.from({ length: randInt(rng, ...cfg.latePaths) }, () =>
      randInt(rng, ...cfg.latePathLen),
    )
    // +3 = waypoint + approach + boss, the three non-path fights. Mimics are
    // excluded by construction (they're chest spurs, added after this).
    const total = earlyLens.reduce((a, b) => a + b, 0) + lateLens.reduce((a, b) => a + b, 0) + 3
    // Shortest route to the boss: fastest early path + waypoint + fastest late
    // path + approach (the boss itself isn't counted, matching the scope's
    // 2+1+3+1 = 7 worked example).
    const shortest = Math.min(...earlyLens) + 1 + Math.min(...lateLens) + 1
    if (total >= minTotal && total <= maxTotal && shortest >= minShort && shortest <= maxShort) {
      return { earlyLens, lateLens, total, shortest }
    }
  }
  throw new Error('dungeon skeleton unsatisfiable — check dungeon-generation.ts bands')
}

// generateDungeon(tier, params, rng): the two-fan-out graph, pure and seeded.
// The same (tier, seed) always yields the identical dungeon — the run store
// never persists a graph, it regenerates from the seed (m2-scope finding E).
export const generateDungeon = (
  tier: number,
  cfg: DungeonGenerationConfig,
  rng: Rng,
  seed: number,
): DungeonGraph => {
  const regulars = byRole(tier, 'regular')
  const boss = byRole(tier, 'boss')[0]
  const mimic = byRole(tier, 'mimic')[0]
  if (regulars.length === 0 || !boss || !mimic) {
    throw new Error(`tier ${tier} roster is missing regulars, a boss, or a mimic`)
  }

  const { earlyLens, lateLens } = rollSkeleton(rng, cfg)
  const nodes: Record<string, DungeonNode> = {}
  const add = (node: DungeonNode): void => {
    nodes[node.id] = node
  }

  // A regular fight node. Entrance/early-first nodes start available (their
  // upstream is the auto-cleared entrance); everything deeper starts locked and
  // opens via clearNode's uniform "any upstream cleared" rule.
  const fight = (id: string, available: boolean): DungeonNode => ({
    id,
    kind: 'fight',
    state: available ? 'available' : 'locked',
    monsterId: pick(rng, regulars).id,
    edges: [],
  })

  // Entrance: a free walk-through, not a fight. Auto-cleared so its downstream
  // early paths read as available from the start under the uniform rule.
  add({ id: 'entrance', kind: 'entrance', state: 'cleared', edges: [] })
  add({ id: 'waypoint', kind: 'waypoint', state: 'locked', monsterId: pick(rng, regulars).id, edges: [] })
  add({ id: 'approach', kind: 'approach', state: 'locked', monsterId: pick(rng, regulars).id, edges: [] })
  add({ id: 'boss', kind: 'boss', state: 'locked', monsterId: boss.id, edges: [] })

  // Early segment: fan out from the entrance, each path feeding the waypoint.
  earlyLens.forEach((len, p) => {
    const path: string[] = []
    for (let i = 0; i < len; i += 1) {
      const id = `e${p}-${i}`
      add(fight(id, i === 0))
      path.push(id)
    }
    nodes.entrance.edges = [...nodes.entrance.edges, path[0]]
    path.forEach((id, i) => {
      nodes[id].edges = [i + 1 < path.length ? path[i + 1] : 'waypoint']
    })
  })

  // Late segment: fan out from the waypoint, each path feeding the approach.
  lateLens.forEach((len, p) => {
    const path: string[] = []
    for (let i = 0; i < len; i += 1) {
      const id = `l${p}-${i}`
      add(fight(id, false))
      path.push(id)
    }
    nodes.waypoint.edges = [...nodes.waypoint.edges, path[0]]
    path.forEach((id, i) => {
      nodes[id].edges = [i + 1 < path.length ? path[i + 1] : 'approach']
    })
  })

  nodes.approach.edges = ['boss']

  // Chests: dead-end spurs off regular fight nodes only (never a chokepoint),
  // scattered across both segments. Exactly one is real; the rest are mimics
  // that look identical until opened (m2-scope#chests).
  const fightIds = Object.values(nodes)
    .filter((node) => node.kind === 'fight')
    .map((node) => node.id)
  const chestCount = randInt(rng, ...cfg.chests)
  const parents = sampleDistinct(rng, fightIds, chestCount)
  const realIndex = Math.floor(rng.next() * parents.length)
  parents.forEach((parentId, i) => {
    const chestId = `chest-${i}`
    const isReal = i === realIndex
    add({
      id: chestId,
      kind: 'chest',
      state: 'locked',
      // The real chest is a reward opened with no fight; a mimic carries the
      // tier's Mimic and is a fight. Both render identically until opened.
      monsterId: isReal ? undefined : mimic.id,
      isRealChest: isReal,
      edges: [],
    })
    nodes[parentId].edges = [...nodes[parentId].edges, chestId]
  })

  return {
    tier,
    seed,
    entranceId: 'entrance',
    bossId: 'boss',
    waypointId: 'waypoint',
    approachId: 'approach',
    nodes,
  }
}
