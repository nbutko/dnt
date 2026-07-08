/**
 * Manifest generator (free, deterministic). Run: `npx tsx manifest-gen.ts`
 *
 * Emits generated/manifest.json — the single source of truth that drives the
 * whole remaining content run (showrunner → draw → compose → lint). Per dungeon:
 * habitat, CR-banded candidate monsters (from docs/monster-manual.json), a dice
 * slice (from dice.json, distinct per dungeon), and the section→tier→mode map
 * derived from content-plan-v2 §2 (dungeon N serves regular [N,N+1,N+2], boss N+3;
 * tiers <=5 are drills handled elsewhere, tiers >=10 are compose-long).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

interface Monster { name: string; type: string; cr: string; habitats?: string[] }
const crNum = (c: string): number => {
  if (c == null) return 0
  const s = String(c)
  if (s.includes('/')) { const [a, b] = s.split('/'); return Number(a) / Number(b) }
  return Number(s) || 0
}

// Dungeons needing composed prose. Drills now stop at T4, so T5 is composed;
// that pulls D2 (Forest, boss serves T5) into scope. D1 is still all drills.
const DUNGEONS: { n: number; name: string; habitat: string; crBand: [number, number] }[] = [
  { n: 2, name: 'forest', habitat: 'Forest', crBand: [1, 3] },
  { n: 3, name: 'hill', habitat: 'Hill', crBand: [1, 4] },
  { n: 4, name: 'coastal', habitat: 'Coastal', crBand: [2, 5] },
  { n: 5, name: 'desert', habitat: 'Desert', crBand: [3, 6] },
  { n: 7, name: 'mountain', habitat: 'Mountain', crBand: [4, 9] },
  { n: 8, name: 'arctic', habitat: 'Arctic', crBand: [3, 13] },
  { n: 9, name: 'underdark', habitat: 'Underdark', crBand: [7, 12] },
  { n: 10, name: 'underwater', habitat: 'Underwater', crBand: [5, 17] },
  { n: 11, name: 'urban', habitat: 'Urban', crBand: [8, 22] },
]
const ROLES = ['First Branch', 'Waypoint', 'Second Branch', 'Approach', 'Boss']

// Drills cover T1-4 (keyboard-restricted). T5 (lowercase sentences) up through
// T9 are compose-short; T10+ are compose-long.
const tierMode = (t: number): 'drill' | 'short' | 'long' => (t <= 4 ? 'drill' : t <= 9 ? 'short' : 'long')

// content-plan-v2 §2: regular sections (1-4) serve [N,N+1,N+2]; boss (5) serves N+3.
const sectionTiers = (n: number, sectionIdx: number): number[] => {
  const tiers = sectionIdx < 4 ? [n, n + 1, n + 2] : [n + 3]
  return tiers.filter((t) => tierMode(t) !== 'drill') // drills handled by drill-gen
}

const manual = JSON.parse(readFileSync('../docs/monster-manual.json', 'utf8')) as Monster[]
// Spread up to `k` candidates evenly across the CR-sorted in-band pool so the
// showrunner has a low→high roster to pick a boss from.
const candidatesFor = (habitat: string, [lo, hi]: [number, number], k = 14): Monster[] => {
  const pool = manual
    .filter((m) => (m.habitats ?? []).includes(habitat))
    .filter((m) => { const c = crNum(m.cr); return c >= lo && c <= hi })
    .sort((a, b) => crNum(a.cr) - crNum(b.cr))
  if (pool.length <= k) return pool
  const out: Monster[] = []
  for (let i = 0; i < k; i++) out.push(pool[Math.floor((i * (pool.length - 1)) / (k - 1))])
  return [...new Map(out.map((m) => [m.name, m])).values()]
}

const dice = JSON.parse(readFileSync('dice.json', 'utf8')) as Record<string, number[]>
// Each dungeon gets a distinct, non-overlapping slice so rolls differ but stay
// deterministic. ~70 d20 covers a 5-section campaign's roll beats with headroom.
const diceSlice = (idx: number) => ({
  d20: dice.d20.slice(idx * 80, idx * 80 + 72),
  d8: dice.d8.slice(idx * 50, idx * 50 + 45),
  d6: dice.d6.slice(idx * 50, idx * 50 + 45),
  d4: dice.d4.slice(idx * 30, idx * 30 + 25),
})

const manifest = DUNGEONS.map((d, i) => ({
  n: d.n,
  name: d.name,
  habitat: d.habitat,
  crBand: d.crBand,
  candidates: candidatesFor(d.habitat, d.crBand).map((m) => ({ name: m.name, cr: m.cr, type: m.type })),
  sections: ROLES.map((role, si) => {
    const tiers = sectionTiers(d.n, si)
    return { n: si + 1, role, tiers, modes: tiers.map(tierMode) }
  }),
  dice: diceSlice(i),
}))

mkdirSync('generated', { recursive: true })
writeFileSync('generated/manifest.json', JSON.stringify({ dungeons: manifest }, null, 2))

console.log('MANIFEST · 8 dungeons\n')
let shortCells = 0, longCells = 0
for (const d of manifest) {
  const cells = d.sections.flatMap((s) => s.tiers.map((t) => ({ t, mode: tierMode(t) })))
  const sc = cells.filter((c) => c.mode === 'short').length
  const lc = cells.filter((c) => c.mode === 'long').length
  shortCells += sc; longCells += lc
  console.log(`  D${d.n} ${d.habitat.padEnd(11)} CR ${d.crBand.join('-').padEnd(6)} ` +
    `${d.candidates.length} cand · cells ${sc} short + ${lc} long`)
  console.log(`      ${d.sections.map((s) => `§${s.n}[${s.tiers.join(',') || '—'}]`).join(' ')}`)
}
console.log(`\n  TOTAL: ${shortCells} short cells + ${longCells} long cells`)
