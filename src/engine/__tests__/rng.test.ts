import { describe, expect, it } from 'vitest'
import { createRng, seedFromString } from '../rng'

describe('createRng', () => {
  it('is deterministic for a given seed', () => {
    const a = createRng(42)
    const b = createRng(42)
    const drawsA = Array.from({ length: 10 }, () => a.next())
    const drawsB = Array.from({ length: 10 }, () => b.next())
    expect(drawsA).toEqual(drawsB)
  })

  it('produces different sequences for different seeds', () => {
    const a = createRng(1)
    const b = createRng(2)
    expect(a.next()).not.toBe(b.next())
  })

  it('next() stays in [0, 1)', () => {
    const rng = createRng(7)
    for (let i = 0; i < 1000; i += 1) {
      const value = rng.next()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('sample() with zero variance always returns the mean', () => {
    const rng = createRng(3)
    for (let i = 0; i < 20; i += 1) {
      expect(rng.sample(100, 0)).toBe(100)
    }
  })

  it('sample() never goes negative', () => {
    const rng = createRng(9)
    for (let i = 0; i < 500; i += 1) {
      expect(rng.sample(1, 5)).toBeGreaterThanOrEqual(0)
    }
  })

  it('sample() is deterministic for a given seed', () => {
    const a = createRng(11)
    const b = createRng(11)
    expect(a.sample(50, 0.2)).toBe(b.sample(50, 0.2))
  })
})

describe('seedFromString', () => {
  it('is deterministic for the same base/text/salt', () => {
    expect(seedFromString(42, 'fight-3')).toBe(seedFromString(42, 'fight-3'))
  })

  it('differs across node ids for the same base seed', () => {
    expect(seedFromString(42, 'fight-3')).not.toBe(seedFromString(42, 'fight-4'))
  })

  it('differs across salts for the same base/text — independent streams', () => {
    expect(seedFromString(42, 'fight-3', 1)).not.toBe(seedFromString(42, 'fight-3', 2))
  })

  it('differs across base seeds for the same text', () => {
    expect(seedFromString(1, 'boss')).not.toBe(seedFromString(2, 'boss'))
  })
})
