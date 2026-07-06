import { describe, expect, it } from 'vitest'
import { abilityMod } from './character'

describe('abilityMod', () => {
  it.each([
    [1, -5],
    [3, -4],
    [8, -1],
    [9, -1],
    [10, 0],
    [11, 0],
    [12, 1],
    [13, 1],
    [14, 2],
    [15, 2],
    [16, 3],
    [18, 4],
    [20, 5],
  ])('abilityMod(%i) === %i', (score, expected) => {
    expect(abilityMod(score)).toBe(expected)
  })
})
