import { describe, expect, it } from 'vitest'
import dungeonGenerationConfig from '../../config/dungeon-generation'
import { createRng } from '../rng'
import { generateDungeon } from './generate'
import type { DungeonGraph } from '../../domain/dungeon'
import { availableNodes, bossUnlocked, clearNode, isComplete } from './graph'

const freshGraph = (seed = 1) =>
  generateDungeon(1, dungeonGenerationConfig, createRng(seed), seed)

// The next fight node along a path (excludes any chest spur hanging off it).
const nextFight = (graph: DungeonGraph, id: string): string =>
  graph.nodes[id].edges.find((target) => graph.nodes[target].kind === 'fight')!

describe('dungeon graph transitions', () => {
  it('starts with the entrance cleared and every early-path first node available', () => {
    const graph = freshGraph()
    expect(graph.nodes.entrance.state).toBe('cleared')
    // Every node the entrance points at is an early-path first node, available.
    graph.nodes.entrance.edges.forEach((id) => {
      expect(graph.nodes[id].state, id).toBe('available')
    })
    // Deeper nodes (waypoint, boss) start locked.
    expect(graph.nodes.waypoint.state).toBe('locked')
    expect(graph.nodes.boss.state).toBe('locked')
  })

  it('clearNode flips its downstream from locked to available, immutably', () => {
    const graph = freshGraph()
    const first = graph.nodes.entrance.edges[0]
    const next = graph.nodes[first].edges[0]
    const after = clearNode(graph, first)
    expect(after.nodes[first].state).toBe('cleared')
    expect(after.nodes[next].state).toBe('available')
    // Original graph untouched.
    expect(graph.nodes[first].state).toBe('available')
  })

  it('opens the waypoint the moment ANY one early path is fully cleared', () => {
    let graph = freshGraph()
    // Walk the first early path to its end (the node that edges into waypoint).
    let cursor = graph.nodes.entrance.edges[0]
    while (!graph.nodes[cursor].edges.includes('waypoint')) {
      const next = nextFight(graph, cursor)
      graph = clearNode(graph, cursor)
      cursor = next
    }
    expect(graph.nodes.waypoint.state).toBe('locked')
    graph = clearNode(graph, cursor)
    expect(graph.nodes.waypoint.state).toBe('available')
  })

  it('gates the boss solely behind the approach, and completes when the boss clears', () => {
    let graph = freshGraph()
    expect(bossUnlocked(graph)).toBe(false)
    graph = clearNode(graph, 'approach')
    expect(bossUnlocked(graph)).toBe(true)
    expect(isComplete(graph)).toBe(false)
    graph = clearNode(graph, 'boss')
    expect(isComplete(graph)).toBe(true)
  })

  it('lists exactly the available nodes', () => {
    const graph = freshGraph()
    const available = availableNodes(graph).map((node) => node.id).sort()
    expect(available).toEqual([...graph.nodes.entrance.edges].sort())
  })
})
