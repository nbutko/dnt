import { describe, expect, it } from 'vitest'
import dungeonGenerationConfig from '../../config/dungeon-generation'
import { createRng } from '../../engine/rng'
import { generateDungeon } from '../../engine/dungeon/generate'
import { layoutDungeon } from './graph-layout'

const freshGraph = (seed = 1) => generateDungeon(1, dungeonGenerationConfig, createRng(seed), seed)

describe('dungeon graph layout', () => {
  it('runs left to right: entrance leftmost, boss rightmost, chokepoints in order', () => {
    const graph = freshGraph()
    const { positions } = layoutDungeon(graph)
    const xs = [...positions.values()].map((p) => p.x)
    const entrance = positions.get(graph.entranceId)!
    const boss = positions.get(graph.bossId)!
    expect(entrance.x).toBe(Math.min(...xs))
    expect(boss.x).toBe(Math.max(...xs))
    expect(positions.get(graph.waypointId)!.x).toBeLessThan(positions.get(graph.approachId)!.x)
    expect(positions.get(graph.approachId)!.x).toBeLessThan(boss.x)
  })

  it('never places two nodes at the same point', () => {
    // Sweep a range of seeds so we don't rely on one lucky shape.
    for (let seed = 0; seed < 200; seed += 1) {
      const { positions } = layoutDungeon(freshGraph(seed))
      const keys = [...positions.values()].map((p) => `${p.x},${p.y}`)
      expect(new Set(keys).size, `seed ${seed}`).toBe(keys.length)
    }
  })

  it('hangs every chest spur right next to its parent fight node', () => {
    const graph = freshGraph(7)
    const { positions } = layoutDungeon(graph)
    Object.values(graph.nodes)
      .filter((node) => node.kind === 'chest')
      .forEach((chest) => {
        const parent = Object.values(graph.nodes).find((node) => node.edges.includes(chest.id))!
        const chestPos = positions.get(chest.id)!
        const parentPos = positions.get(parent.id)!
        const dist = Math.hypot(chestPos.x - parentPos.x, chestPos.y - parentPos.y)
        // A short spur — closer to its parent than parents are to each other.
        expect(dist, chest.id).toBeLessThan(80)
      })
  })

  it('positions every node in the graph within the reported canvas', () => {
    const { positions, width, height } = layoutDungeon(freshGraph(3))
    positions.forEach((p) => {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(width)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(height)
    })
  })
})
