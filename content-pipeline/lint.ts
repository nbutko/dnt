/**
 * Lint script (free, deterministic). Run: `npx tsx lint.ts <dungeon>`
 *
 * Stage 4 of the pipeline (content-plan-v2.html §3.4 / §7.5): legality + dedup
 * + coverage on a composed pool. Zero LLM cost. Emits a per-cell verdict and,
 * crucially, the exact shortfall per (section × tier) cell so the orchestrator
 * dispatches a *targeted* top-up rather than recomposing a passing cell.
 *
 * Input : generated/pools/<dungeon>.json  ({ dungeon, cells:[{section,tier,lines}] })
 * Output: console report + generated/pools/<dungeon>.clean.json (deduped, legal-only)
 */
import { readFileSync, writeFileSync } from 'node:fs'

// Volume targets shrink as tiers lengthen (content-plan-v2 §3.5): T6-10 ~50,
// T11-12 ~30, T13-14 ~20. A cell passes at ~90% of target.
const targetFor = (tier: number): number => (tier <= 10 ? 50 : tier <= 12 ? 30 : 20)
const floorFor = (tier: number): number => (tier <= 10 ? 45 : tier <= 12 ? 26 : 17)

// The player never hears the table — party/GM handles must never leak into a
// prompt. compose prompts forbid them, but the model isn't 100% reliable, so
// the lint enforces it (the names are legal letters, so legality alone misses them).
const CAST = /\b(mab|bront|quill|sable|fife)\b/i

// Shifted symbols introduced at T9 (each T9 line must use >= 1).
const SHIFTED = /[!?:+&%()]/
// Per-tier legal character class + length window + extra coverage predicate.
interface TierRule { legal: RegExp; min: number; max: number; extra?: (s: string) => boolean; caps: 'single' | 'free' }
const RULES: Record<number, TierRule> = {
  5: { legal: /^[a-z ]+$/, min: 35, max: 58, caps: 'free' }, // lowercase sentence, full kbd, no caps/punct/digits
  6: { legal: /^[A-Za-z ,.]+$/, min: 15, max: 60, caps: 'single' },
  7: { legal: /^[A-Za-z ,.'\-;/]+$/, min: 20, max: 80, caps: 'free' },
  8: { legal: /^[A-Za-z ,.'\-;/0-9]+$/, min: 30, max: 110, caps: 'free', extra: (s) => /[0-9]/.test(s) },
  9: { legal: /^[A-Za-z0-9 ,.'\-;/!?:+&%()]+$/, min: 40, max: 150, caps: 'free', extra: (s) => SHIFTED.test(s) },
  // Long stamina tiers: full complexity (T9 char set), no per-line predicate —
  // these are multi-sentence passages, gated on target CHARACTER length.
  10: { legal: /^[A-Za-z0-9 ,.'\-;/!?:+&%()]+$/, min: 120, max: 300, caps: 'free' },
  11: { legal: /^[A-Za-z0-9 ,.'\-;/!?:+&%()]+$/, min: 200, max: 460, caps: 'free' },
  12: { legal: /^[A-Za-z0-9 ,.'\-;/!?:+&%()]+$/, min: 430, max: 1000, caps: 'free' },
  13: { legal: /^[A-Za-z0-9 ,.'\-;/!?:+&%()]+$/, min: 850, max: 1700, caps: 'free' },
  14: { legal: /^[A-Za-z0-9 ,.'\-;/!?:+&%()]+$/, min: 1300, max: 2600, caps: 'free' },
}

// T6 caps rule: only sentence-initial letters may be uppercase.
const capsOk = (s: string, mode: 'single' | 'free'): boolean => {
  if (mode === 'free') return true
  for (const sent of s.split(/(?<=\.)\s+/)) {
    const letters = [...sent].filter((c) => /[A-Za-z]/.test(c))
    if (!letters.length) continue
    if (letters[0] !== letters[0].toUpperCase()) return false      // must start capital
    if (letters.slice(1).some((c) => c !== c.toLowerCase())) return false // no other caps
  }
  return true
}

// LLMs emit typographic characters (em/en dashes, curly quotes, ellipsis) that
// aren't in any tier's legal ASCII set. Fold them to ASCII BEFORE legality so we
// recover otherwise-legal lines instead of discarding them — the shipped JSON
// then carries only plain ASCII the game's keyboard model can produce.
const asciify = (s: string): string => s
  .replace(/[—–]/g, '-')      // em/en dash → hyphen
  .replace(/[‘’]/g, "'")      // curly single quote → apostrophe
  .replace(/[“”]/g, '')       // curly double quote → drop (no tier allows ")
  .replace(/…/g, '...')            // ellipsis → three dots
  .replace(/ /g, ' ')              // nbsp → space
  .replace(/\s+/g, ' ')
  .trim()

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

interface Reason { line: string; why: string }
const check = (line: string, tier: number): string | null => {
  const r = RULES[tier]
  if (!r) return 'unknown-tier'
  const s = line.trim()
  if (s.length < r.min) return `short(${s.length})`
  if (s.length > r.max) return `long(${s.length})`
  if (!r.legal.test(s)) return 'illegal-char'
  if (CAST.test(s)) return 'cast-name'
  if (!capsOk(s, r.caps)) return 'bad-caps'
  if (r.extra && !r.extra(s)) return tier === 8 ? 'no-digit' : 'no-symbol'
  return null
}

interface Cell { section: number; tier: number; lines: string[] }
const dungeon = process.argv[2] ?? 'swamp'
const data = JSON.parse(readFileSync(`generated/pools/${dungeon}.json`, 'utf8')) as { dungeon: string; cells: Cell[] }

console.log(`LINT · ${dungeon}   (targets: T6-10 50, T11-12 30, T13-14 20)\n`)
console.log('  cell        raw  legal  uniq  status   drops')
console.log('  ' + '─'.repeat(52))

const cleanCells: Cell[] = []
const shortfalls: { section: number; tier: number; have: number; need: number; seed: string[] }[] = []
let totRaw = 0, totKept = 0

for (const cell of [...data.cells].sort((a, b) => a.section - b.section || a.tier - b.tier)) {
  const seen = new Set<string>()
  const kept: string[] = []
  const rejected: Record<string, number> = {}
  for (const rawLine of cell.lines) {
    totRaw++
    const line = asciify(rawLine)
    const why = check(line, cell.tier)
    if (why) { rejected[why.replace(/\(.*/, '')] = (rejected[why.replace(/\(.*/, '')] ?? 0) + 1; continue }
    const key = norm(line)
    if (seen.has(key)) { rejected['dup'] = (rejected['dup'] ?? 0) + 1; continue }
    seen.add(key); kept.push(line.trim())
  }
  totKept += kept.length
  cleanCells.push({ section: cell.section, tier: cell.tier, lines: kept })
  const legal = cell.lines.length - (rejected['dup'] ?? 0) - Object.entries(rejected).filter(([k]) => k !== 'dup').reduce((a, [, v]) => a + v, 0) + (rejected['dup'] ?? 0)
  const nLegal = kept.length + (rejected['dup'] ?? 0)
  const status = kept.length >= floorFor(cell.tier) ? 'PASS' : kept.length >= 1 ? 'SHORT' : 'EMPTY'
  const drops = Object.entries(rejected).filter(([, v]) => v > 0).map(([k, v]) => `${k}:${v}`).join(' ')
  console.log(`  §${cell.section} T${cell.tier}   ${String(cell.lines.length).padStart(6)} ${String(nLegal).padStart(6)} ${String(kept.length).padStart(5)}  ${status.padEnd(7)} ${drops}`)
  if (kept.length < targetFor(cell.tier)) shortfalls.push({ section: cell.section, tier: cell.tier, have: kept.length, need: targetFor(cell.tier) - kept.length, seed: [] })
}

writeFileSync(`generated/pools/${dungeon}.clean.json`, JSON.stringify({ dungeon, cells: cleanCells }, null, 2))

console.log('\n  ' + '─'.repeat(52))
console.log(`  kept ${totKept}/${totRaw} lines across ${cleanCells.length} cells`)
const passing = cleanCells.filter((c) => c.lines.length >= floorFor(c.tier)).length
console.log(`  ${passing}/${cleanCells.length} cells PASS (per-tier floor)`)
if (shortfalls.length) {
  console.log('\n  SHORTFALLS (need targeted top-up):')
  for (const s of shortfalls) console.log(`    §${s.section} T${s.tier}: have ${s.have}, need +${s.need}`)
} else {
  console.log('\n  ✓ every cell at target — no top-ups needed')
}
