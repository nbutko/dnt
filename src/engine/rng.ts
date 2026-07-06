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
