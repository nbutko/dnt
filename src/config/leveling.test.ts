import { describe, expect, it } from 'vitest'
import { ASI_LEVELS, getProficiencyBonus, getXpThreshold, PROFICIENCY_BY_LEVEL, XP_THRESHOLDS } from './leveling'

describe('leveling config', () => {
  it('has a monotonically increasing XP table', () => {
    for (let i = 1; i < XP_THRESHOLDS.length; i += 1) {
      expect(XP_THRESHOLDS[i]).toBeGreaterThan(XP_THRESHOLDS[i - 1])
    }
  })

  it('starts the XP table at 0 for level 1', () => {
    expect(XP_THRESHOLDS[0]).toBe(0)
  })

  it('keeps every ASI level inside the level range the XP table covers', () => {
    for (const level of ASI_LEVELS) {
      expect(level).toBeGreaterThanOrEqual(1)
      expect(level).toBeLessThanOrEqual(XP_THRESHOLDS.length)
    }
  })

  it('never decreases the proficiency ramp', () => {
    for (let i = 1; i < PROFICIENCY_BY_LEVEL.length; i += 1) {
      expect(PROFICIENCY_BY_LEVEL[i]).toBeGreaterThanOrEqual(PROFICIENCY_BY_LEVEL[i - 1])
    }
  })

  it('covers the same level range for XP and proficiency', () => {
    expect(PROFICIENCY_BY_LEVEL.length).toBe(XP_THRESHOLDS.length)
  })

  it('clamps lookups to the table bounds', () => {
    expect(getXpThreshold(1)).toBe(XP_THRESHOLDS[0])
    expect(getXpThreshold(0)).toBe(XP_THRESHOLDS[0])
    expect(getXpThreshold(999)).toBe(XP_THRESHOLDS.at(-1))
    expect(getProficiencyBonus(1)).toBe(2)
    expect(getProficiencyBonus(999)).toBe(PROFICIENCY_BY_LEVEL.at(-1))
  })
})
