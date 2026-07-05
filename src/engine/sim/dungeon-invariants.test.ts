import { describe, expect, it } from 'vitest'
import { DUNGEON_TIERS } from '../../config/dungeon-tiers'
import dungeonGenerationConfig from '../../config/dungeon-generation'
import { createRng } from '../rng'
import { generateDungeon } from '../dungeon/generate'
import { describeDungeon, sweepDungeons } from './dungeon-invariants'

const SEEDS_PER_TIER = 500

describe('dungeon invariant sweep', () => {
  it('holds every scope invariant across the whole ladder and many seeds', () => {
    for (const { tier } of DUNGEON_TIERS) {
      const violations = sweepDungeons(tier, SEEDS_PER_TIER)
      expect(violations.slice(0, 5), `tier ${tier} violations`).toEqual([])
    }
  })

  it('prints a sample tier-1 dungeon that reads as the two-fan-out shape', () => {
    const graph = generateDungeon(1, dungeonGenerationConfig, createRng(7), 7)
    // Not an assertion of exact layout — just a reviewable dump proving the
    // shape (entrance → early → waypoint → late → approach → boss + chests).
    console.info(`\n${describeDungeon(graph)}\n`)
    expect(graph.nodes.entrance.kind).toBe('entrance')
    expect(graph.nodes.boss.kind).toBe('boss')
  })

  it('regenerates the identical dungeon from the same (tier, seed)', () => {
    const a = generateDungeon(3, dungeonGenerationConfig, createRng(42), 42)
    const b = generateDungeon(3, dungeonGenerationConfig, createRng(42), 42)
    expect(a).toEqual(b)
  })
})
