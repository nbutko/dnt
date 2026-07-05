import dungeonGenerationConfig from '../../config/dungeon-generation'
import type { DungeonGraph, DungeonNode } from '../../domain/dungeon'
import { createRng } from '../rng'
import { generateDungeon } from '../dungeon/generate'

// A monster fight for total/shortest-path accounting — every node the player
// actually fights *except* mimics, which are chests (excluded from the ~30
// count per the scope).
const isMonsterFight = (node: DungeonNode): boolean =>
  node.kind === 'fight' || node.kind === 'waypoint' || node.kind === 'approach' || node.kind === 'boss'

export interface DungeonMetrics {
  totalMonsters: number
  shortestPath: number
  chestCount: number
  realChestCount: number
  chestsOnChokepoints: number
}

// Fewest monster fights to reach the boss's gate (the approach), counting the
// approach but not the boss itself — matches the scope's 2+1+3+1 = 7 worked
// example. A 0/1-weight shortest path (fights cost 1, entrance/chests 0) from
// the entrance; chests are dead ends so they never sit on a route to the boss.
const shortestPathToBoss = (graph: DungeonGraph): number => {
  const dist: Record<string, number> = {}
  Object.keys(graph.nodes).forEach((id) => {
    dist[id] = Infinity
  })
  dist[graph.entranceId] = 0
  // Small fixed graph — a plain relaxation loop until nothing improves is
  // clearer than a priority queue and just as correct here.
  for (let changed = true; changed; ) {
    changed = false
    for (const node of Object.values(graph.nodes)) {
      if (dist[node.id] !== Infinity) {
        for (const targetId of node.edges) {
          const step = isMonsterFight(graph.nodes[targetId]) ? 1 : 0
          if (dist[node.id] + step < dist[targetId]) {
            dist[targetId] = dist[node.id] + step
            changed = true
          }
        }
      }
    }
  }
  return dist[graph.approachId]
}

export const analyzeDungeon = (graph: DungeonGraph): DungeonMetrics => {
  const nodes = Object.values(graph.nodes)
  const chests = nodes.filter((node) => node.kind === 'chest')
  // A chest sits on a chokepoint if its parent (the node that edges into it) is
  // the waypoint or approach — the scope forbids this.
  const parentOf = (chestId: string): DungeonNode | undefined =>
    nodes.find((node) => node.edges.includes(chestId))
  const chestsOnChokepoints = chests.filter((chest) => {
    const parent = parentOf(chest.id)
    return parent?.kind === 'waypoint' || parent?.kind === 'approach'
  }).length

  return {
    totalMonsters: nodes.filter(isMonsterFight).length,
    shortestPath: shortestPathToBoss(graph),
    chestCount: chests.length,
    realChestCount: chests.filter((chest) => chest.isRealChest).length,
    chestsOnChokepoints,
  }
}

export interface InvariantViolation {
  seed: number
  tier: number
  reason: string
  metrics: DungeonMetrics
}

// Generate across a seed range for one tier and collect any invariant breach.
export const sweepDungeons = (tier: number, seeds: number): InvariantViolation[] => {
  const [minTotal, maxTotal] = dungeonGenerationConfig.targetTotal
  const [minShort, maxShort] = dungeonGenerationConfig.shortestPath
  const violations: InvariantViolation[] = []
  for (let seed = 0; seed < seeds; seed += 1) {
    const graph = generateDungeon(tier, dungeonGenerationConfig, createRng(seed), seed)
    const metrics = analyzeDungeon(graph)
    const fail = (reason: string): void => {
      violations.push({ seed, tier, reason, metrics })
    }
    if (metrics.shortestPath < minShort || metrics.shortestPath > maxShort) {
      fail(`shortestPath ${metrics.shortestPath} out of [${minShort}, ${maxShort}]`)
    }
    if (metrics.totalMonsters < minTotal || metrics.totalMonsters > maxTotal) {
      fail(`totalMonsters ${metrics.totalMonsters} out of [${minTotal}, ${maxTotal}]`)
    }
    if (metrics.realChestCount !== 1) {
      fail(`realChestCount ${metrics.realChestCount} !== 1`)
    }
    if (metrics.chestCount < dungeonGenerationConfig.chests[0] || metrics.chestCount > dungeonGenerationConfig.chests[1]) {
      fail(`chestCount ${metrics.chestCount} out of range`)
    }
    if (metrics.chestsOnChokepoints !== 0) {
      fail(`${metrics.chestsOnChokepoints} chest(s) on a chokepoint`)
    }
  }
  return violations
}

// A human-readable dump of one dungeon — used by the sim test to print a
// sample so a reviewer can eyeball that it reads as the scope's shape.
export const describeDungeon = (graph: DungeonGraph): string => {
  const lines: string[] = []
  const chestTag = (node: DungeonNode): string => {
    if (node.kind !== 'chest') return ''
    return node.isRealChest ? ' (real)' : ' (mimic)'
  }
  const label = (node: DungeonNode): string =>
    `${node.id} [${node.kind}/${node.state}]${chestTag(node)} -> ${node.edges.join(', ') || '·'}`
  const order = ['entrance', 'waypoint', 'approach', 'boss']
  order.forEach((id) => lines.push(label(graph.nodes[id])))
  Object.values(graph.nodes)
    .filter((node) => !order.includes(node.id))
    .forEach((node) => lines.push(label(node)))
  const m = analyzeDungeon(graph)
  lines.push(
    `metrics: total=${m.totalMonsters} shortest=${m.shortestPath} ` +
      `chests=${m.chestCount} (real=${m.realChestCount})`,
  )
  return lines.join('\n')
}
