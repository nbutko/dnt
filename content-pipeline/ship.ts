/**
 * Ship script (free, deterministic). Run: `npx tsx ship.ts`
 *
 * The last hop from the content pipeline into the app (content-plan-v2.html
 * §3.6). Reads every <dungeon>.merged.json and emits a single bundled
 * src/content/text/library.json the game imports at build time.
 *
 * Sections collapse away here on purpose: a dungeon's regular sections (1-4)
 * all carry tiers [N, N+1, N+2] and its boss (5) carries only N+3 — disjoint
 * tier sets — so keying the shipped file by (dungeon → tier) needs no section
 * dimension. A regular fight served tier T draws the union of §1-4 at T (~200
 * lines); the boss at N+3 draws §5. The app selects content by (dungeon, tier)
 * alone (state/battle-store.ts), which is exactly this shape.
 *
 * Output: src/content/text/library.json
 *   { version, dungeons: { "<n>": { "<tier>": string[] } } }
 */
import { readFileSync, writeFileSync } from 'node:fs'

const NAMES = ['grassland', 'forest', 'hill', 'coastal', 'desert', 'swamp',
  'mountain', 'arctic', 'underdark', 'underwater', 'urban']

interface Cell { section: number; tier: number; lines: string[] }
interface Merged { dungeon: string; n: number; cells: Cell[] }

const dungeons: Record<string, Record<string, string[]>> = {}
let totalLines = 0

console.log('SHIP · library.json  (per-dungeon, section-collapsed by tier)\n')
console.log('  dungeon      tiers                       lines')
console.log('  ' + '─'.repeat(50))

for (const name of NAMES) {
  const m = JSON.parse(readFileSync(`generated/pools/${name}.merged.json`, 'utf8')) as Merged
  const byTier: Record<string, string[]> = {}
  for (const cell of m.cells) {
    const key = String(cell.tier)
    ;(byTier[key] ??= []).push(...cell.lines)
  }
  dungeons[String(m.n)] = byTier
  const tiers = Object.keys(byTier).map(Number).sort((a, b) => a - b)
  const count = tiers.reduce((a, t) => a + byTier[String(t)].length, 0)
  totalLines += count
  console.log(`  D${String(m.n).padStart(2)} ${name.padEnd(11)} [${tiers.join(',').padEnd(24)}] ${String(count).padStart(6)}`)
}

writeFileSync('../src/content/text/library.json', JSON.stringify({ version: 1, dungeons }, null, 2))

console.log('\n  ' + '─'.repeat(50))
// Global tier → line count, the fallback the loader unions across dungeons.
const globalByTier: Record<number, number> = {}
for (const byTier of Object.values(dungeons)) {
  for (const [t, lines] of Object.entries(byTier)) globalByTier[Number(t)] = (globalByTier[Number(t)] ?? 0) + lines.length
}
const tiersCovered = Object.keys(globalByTier).map(Number).sort((a, b) => a - b)
console.log(`  shipped ${totalLines} lines across ${NAMES.length} dungeons`)
console.log(`  global tiers covered: ${tiersCovered.join(', ')}`)
const gaps = Array.from({ length: 14 }, (_, i) => i + 1).filter((t) => !globalByTier[t])
console.log(gaps.length ? `  ⚠ tiers with NO content anywhere: ${gaps.join(', ')}` : '  ✓ every tier 1-14 has content globally (loader fallback safe)')
