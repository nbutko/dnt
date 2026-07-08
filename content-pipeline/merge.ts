/**
 * Merge script (free, deterministic). Run: `npx tsx merge.ts`
 *
 * Final assembly (content-plan-v2.html §3.6): fold the shared drill tiers into
 * each dungeon's composed pool so the *app reads one uniform file per dungeon*
 * — section 1-5 × its tier band — instead of stitching drills and prose from
 * two different shapes at runtime. Also lets the whole library be audited
 * uniformly (one grid per dungeon, every cell legal + at floor).
 *
 * Per content-plan-v2 §2, dungeon N's sections 1-4 serve tiers [N, N+1, N+2]
 * and the boss (§5) serves N+3. Cells at tier ≤4 are drills (generated fresh
 * per dungeon×section×tier — the same tier reads differently in different early
 * stages, a bit of variety for free); cells at tier ≥5 come from the composed
 * <dungeon>.clean.json. D1 (Grassland) is entirely drills and has no clean file.
 *
 * Input : generated/pools/<name>.clean.json  (composed, for D2-D11)
 * Output: generated/pools/<name>.merged.json  ({ dungeon, n, cells:[{section,tier,lines}] })
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { genDrill, DRILL_SPECS } from './drill-gen'

// The 11 dungeons in ladder order (names match the pool files / rosterPool).
const DUNGEONS: { n: number; name: string }[] = [
  { n: 1, name: 'grassland' }, { n: 2, name: 'forest' }, { n: 3, name: 'hill' },
  { n: 4, name: 'coastal' }, { n: 5, name: 'desert' }, { n: 6, name: 'swamp' },
  { n: 7, name: 'mountain' }, { n: 8, name: 'arctic' }, { n: 9, name: 'underdark' },
  { n: 10, name: 'underwater' }, { n: 11, name: 'urban' },
]
const DRILL_COUNT = 50 // per drill cell — matches composed cell density (~50)
const isDrill = (tier: number): boolean => tier <= 4

// content-plan-v2 §2: regular sections 1-4 → [N,N+1,N+2]; boss §5 → N+3.
const gridTiers = (n: number, section: number): number[] =>
  section < 5 ? [n, n + 1, n + 2] : [n + 3]

// Distinct, reproducible seed per (dungeon × section × tier) so early stages vary.
const drillSeed = (n: number, section: number, tier: number): number => 700000 + n * 1000 + section * 100 + tier

interface Cell { section: number; tier: number; lines: string[] }
const drillLegal = (tier: number): RegExp => DRILL_SPECS.find((s) => s.tier === tier)!.legal

console.log('MERGE · 11 dungeons  (drills T1-4 folded into composed pools)\n')
console.log('  dungeon      cells  drill  prose  lines   status')
console.log('  ' + '─'.repeat(54))

let ok = true
for (const { n, name } of DUNGEONS) {
  // Composed cells keyed "section:tier" (present for D2-D11).
  const composed = new Map<string, string[]>()
  const cleanPath = `generated/pools/${name}.clean.json`
  if (existsSync(cleanPath)) {
    const data = JSON.parse(readFileSync(cleanPath, 'utf8')) as { cells: Cell[] }
    for (const c of data.cells) composed.set(`${c.section}:${c.tier}`, c.lines)
  }

  const cells: Cell[] = []
  const problems: string[] = []
  let nDrill = 0, nProse = 0
  for (let section = 1; section <= 5; section++) {
    for (const tier of gridTiers(n, section)) {
      let lines: string[]
      if (isDrill(tier)) {
        lines = genDrill(tier, DRILL_COUNT, drillSeed(n, section, tier))
        nDrill++
        // Belt-and-braces: drills are generated legal, but verify at the seam.
        const legal = drillLegal(tier)
        if (lines.some((l) => !legal.test(l))) problems.push(`§${section} T${tier} illegal drill`)
        if (lines.length < DRILL_COUNT) problems.push(`§${section} T${tier} short drill (${lines.length})`)
      } else {
        lines = composed.get(`${section}:${tier}`) ?? []
        nProse++
        if (!lines.length) problems.push(`§${section} T${tier} MISSING composed`)
      }
      cells.push({ section, tier, lines })
    }
  }

  cells.sort((a, b) => a.section - b.section || a.tier - b.tier)
  writeFileSync(`generated/pools/${name}.merged.json`, JSON.stringify({ dungeon: name, n, cells }, null, 2))

  const total = cells.reduce((a, c) => a + c.lines.length, 0)
  const status = problems.length ? `FAIL ${problems.join('; ')}` : 'PASS'
  if (problems.length) ok = false
  console.log(`  D${String(n).padStart(2)} ${name.padEnd(11)} ${String(cells.length).padStart(4)}  ${String(nDrill).padStart(5)}  ${String(nProse).padStart(5)}  ${String(total).padStart(5)}   ${status}`)
}

console.log('\n  ' + '─'.repeat(54))
console.log(ok ? '  ✓ all 11 dungeons merged — every cell legal + at floor' : '  ⚠ problems above — merged files written but incomplete')
