import { describe, expect, it } from 'vitest'
import type { Rng } from '../../domain/types'
import { rollMimicSense, type MimicSenseModifiers } from './mimic-sense'

// Same fixed-sequence fake as encounter-roll.test.ts — dictates exactly which
// d20 face rollMimicSense draws instead of hunting for a seed.
const fakeRng = (values: number[]): Rng => {
  let i = 0
  return {
    next: () => {
      const value = values[i % values.length]
      i += 1
      return value
    },
    sample: (mean) => mean,
  }
}

// floor(v*20)+1 -> natural, same mapping as encounter-roll.test.ts.
const NAT = {
  1: 0.0,
  5: 0.21,
  14: 0.66,
  18: 0.86,
  20: 0.96,
} as const

const mods = (overrides: Partial<MimicSenseModifiers> = {}): MimicSenseModifiers => ({
  wisMod: 0,
  proficiencyBonus: 0,
  expertise: false,
  ...overrides,
})

describe('rollMimicSense', () => {
  it('surfaces on a mimic when the total beats the DC', () => {
    // natural 18 + wis 1 + prof 2 = 21 vs DC 15.
    const result = rollMimicSense(true, 15, mods({ wisMod: 1, proficiencyBonus: 2 }), fakeRng([NAT[18]]))
    expect(result.natural).toBe(18)
    expect(result.total).toBe(21)
    expect(result.success).toBe(true)
  })

  it('never surfaces on a mimic when the total fails to beat the DC', () => {
    // natural 5 + no bonuses = 5 vs DC 15.
    const result = rollMimicSense(true, 15, mods(), fakeRng([NAT[5]]))
    expect(result.total).toBe(5)
    expect(result.success).toBe(false)
  })

  it('NEVER surfaces on a real chest, even a nat-20 that would trivially beat the DC', () => {
    const result = rollMimicSense(false, 10, mods({ wisMod: 5, proficiencyBonus: 4 }), fakeRng([NAT[20]]))
    expect(result.total).toBeGreaterThanOrEqual(10)
    expect(result.success).toBe(false)
  })

  it('a passing roll on a real chest still reports success:false — no false alarms', () => {
    // Every roll the mimic-sense function could ever grade a real chest with
    // must come back false; sweep a range of naturals to be sure none slip
    // through the isMimic gate.
    for (const nat of Object.values(NAT)) {
      const result = rollMimicSense(false, 1, mods({ wisMod: 10, proficiencyBonus: 10 }), fakeRng([nat]))
      expect(result.success).toBe(false)
    }
  })

  it('Rogue Expertise doubles proficiency on this check specifically', () => {
    const withoutExpertise = rollMimicSense(
      true,
      15,
      mods({ wisMod: 0, proficiencyBonus: 3, expertise: false }),
      fakeRng([NAT[14]]),
    )
    const withExpertise = rollMimicSense(
      true,
      15,
      mods({ wisMod: 0, proficiencyBonus: 3, expertise: true }),
      fakeRng([NAT[14]]),
    )
    // natural 14 + prof 3 = 17 without expertise; + prof*2=6 = 20 with it.
    expect(withoutExpertise.total).toBe(17)
    expect(withExpertise.total).toBe(20)
  })

  it('DC scales by tier — the same roll can pass a shallow DC and fail a deep one', () => {
    // natural 14 + wis 2 + prof 2 = 18.
    const shallow = rollMimicSense(true, 10, mods({ wisMod: 2, proficiencyBonus: 2 }), fakeRng([NAT[14]]))
    const deep = rollMimicSense(true, 19, mods({ wisMod: 2, proficiencyBonus: 2 }), fakeRng([NAT[14]]))
    expect(shallow.total).toBe(18)
    expect(shallow.total).toBe(deep.total) // same roll + mods
    expect(shallow.success).toBe(true) // 18 >= 10
    expect(deep.success).toBe(false) // 18 >= 19 is false
  })

  it('is deterministic for the same rng sequence', () => {
    const a = rollMimicSense(true, 15, mods({ wisMod: 2 }), fakeRng([NAT[14]]))
    const b = rollMimicSense(true, 15, mods({ wisMod: 2 }), fakeRng([NAT[14]]))
    expect(a).toEqual(b)
  })
})
