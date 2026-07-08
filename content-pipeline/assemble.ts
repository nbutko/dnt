/**
 * Assemble helper (free). Run: `npx tsx assemble.ts <compose-output-file.json>`
 *
 * Merges a compose workflow's result ({cells:[{dungeon,name,section,tier,lines}]})
 * into the per-dungeon pool files generated/pools/<name>.json. Idempotent: a cell
 * with the same (section,tier) is replaced, others are kept — so short and long
 * passes (and top-ups) accumulate into one pool per dungeon without clobbering.
 *
 * The input may be either the raw workflow return object or a task .output file
 * (which wraps the return under `.result`).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'

interface Cell { name: string; section: number; tier: number; lines: string[] }
const raw = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const cells: (Cell & { dungeon?: number })[] = (raw.result?.cells ?? raw.cells)
if (!cells) { console.error('no cells in input'); process.exit(1) }

mkdirSync('generated/pools', { recursive: true })
const byName = new Map<string, (Cell & { dungeon?: number })[]>()
for (const c of cells) { if (!byName.has(c.name)) byName.set(c.name, []); byName.get(c.name)!.push(c) }

for (const [name, incoming] of byName) {
  const path = `generated/pools/${name}.json`
  const existing: { dungeon: string; cells: { section: number; tier: number; lines: string[] }[] } =
    existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { dungeon: name, cells: [] }
  const keyed = new Map(existing.cells.map((c) => [`${c.section}:${c.tier}`, c]))
  for (const c of incoming) keyed.set(`${c.section}:${c.tier}`, { section: c.section, tier: c.tier, lines: c.lines })
  const merged = { dungeon: name, cells: [...keyed.values()].sort((a, b) => a.section - b.section || a.tier - b.tier) }
  writeFileSync(path, JSON.stringify(merged, null, 2))
  console.log(`  ${name}: +${incoming.length} cells → ${merged.cells.length} total, ${merged.cells.reduce((a, c) => a + c.lines.length, 0)} raw lines`)
}
