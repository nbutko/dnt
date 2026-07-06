import type { Rng } from '../domain/types'

// mulberry32: small, fast, seedable PRNG. Deterministic for a given seed,
// which is what makes a whole battle reproducible/testable (see engine/battle.ts).
const mulberry32 = (seed: number) => {
  let state = seed
  return (): number => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Uniform 1..sides — the shared die-roll primitive (engine/damage.ts's
// weapon dice; engine/dice/encounter-roll.ts rolls its own d20 inline the
// same way, predating this helper).
export const rollDie = (rng: Rng, sides: number): number => Math.floor(rng.next() * sides) + 1

// Folds a string (typically a dungeon node id) into a base seed to mint an
// independent, reproducible rng stream per node — e.g. the encounter d20
// (Story 12) and the real chest's loot roll each need their own stream, keyed
// off the run's graph seed + the specific node, so neither shares draws with
// the graph generator, the mimic-sense check (its own `graph.seed + 7919`
// stream), or the battle's own rng. `salt` lets two different callers derive
// distinct streams from the same node id (e.g. the encounter roll vs. the
// chest loot roll) without colliding. Not itself an Rng — wrap the result in
// createRng().
export const seedFromString = (base: number, text: string, salt = 0): number => {
  let hash = (base ^ salt) | 0
  for (let i = 0; i < text.length; i += 1) {
    hash = (Math.imul(hash, 31) + text.charCodeAt(i)) | 0
  }
  return hash
}

export const createRng = (seed: number): Rng => {
  const random = mulberry32(seed)

  const next = (): number => random()

  // Box-Muller normal sample, std dev expressed as a fraction (`variance`) of
  // the mean, clamped to non-negative since these back durations (ms/s).
  const sample = (mean: number, variance: number): number => {
    const u1 = Math.max(next(), Number.EPSILON)
    const u2 = next()
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    return Math.max(0, mean + z * mean * variance)
  }

  return { next, sample }
}
