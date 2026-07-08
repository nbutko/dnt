/**
 * Draw script (free, deterministic). Run: `npx tsx draw.ts [dungeonName|all]`
 *
 * Stage 2 of seed-and-compose (content-plan-v2.html §3.2 / §7.5). Reads each
 * campaign transcript ONCE and emits pre-drawn seed bundles per section — the
 * tiny slices compose agents get instead of the whole transcript. Two bundle
 * sizes, because the two compose modes seed differently:
 *   • short (4 words / 3-line window)  → compose-short, tiers 6-9
 *   • long  (~18 words / ≤15-line window) → compose-long, tiers 10-14
 *
 * Manifest-driven (generated/manifest.json). Input: <name>/campaign.md.
 * Output: generated/draws/<name>.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const mulberry32 = (seed: number) => (): number => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// Stopwords + weak/generic words + the party/GM handles (composed prompts are
// about the WORLD, never the meta table).
const STOP = new Set<string>([
  'the', 'and', 'but', 'for', 'are', 'was', 'were', 'you', 'your', 'yours', 'his',
  'her', 'hers', 'its', 'our', 'their', 'them', 'they', 'this', 'that', 'these',
  'those', 'with', 'from', 'into', 'onto', 'off', 'not', 'all', 'any', 'one', 'two',
  'has', 'had', 'have', 'will', 'would', 'could', 'should', 'can', 'did', 'does',
  'done', 'get', 'got', 'let', 'lets', 'now', 'then', 'than', 'too', 'own', 'yet',
  'who', 'why', 'how', 'what', 'when', 'where', 'here', 'there', 'been', 'being',
  'about', 'over', 'under', 'very', 'just', 'like', 'well', 'okay', 'yeah', 'huh',
  'oh', 'ah', 'aha', 'hey', 'ugh', 'onward', 'give', 'take', 'put', 'come', 'came',
  'goes', 'went', 'say', 'says', 'said', 'see', 'saw', 'look', 'looks', 'want',
  'wants', 'need', 'know', 'knew', 'think', 'thing', 'things', 'something',
  'nothing', 'everyone', 'nobody',
  'mab', 'bront', 'quill', 'sable', 'fife', 'hag',
])

const cleanWords = (raw: string): string[] => {
  const line = raw
    .replace(/^\*\*[^*]+\*\*:?/, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/\*\*/g, ' ')
  return (line.match(/[A-Za-z]+/g) ?? [])
    .map((w) => w.toLowerCase())
    .filter((w) => w.length >= 3 && !STOP.has(w))
}

interface Parsed { words: string[][]; monster: string }
const parseSections = (md: string): Map<number, Parsed> => {
  const out = new Map<number, Parsed>()
  let cur: number | null = null
  for (const raw of md.split('\n')) {
    const head = raw.match(/^##\s*§(\d+)[^(]*\(([^)]*)\)/)
    const headNoMon = raw.match(/^##\s*§(\d+)/)
    if (head) { cur = Number(head[1]); out.set(cur, { words: [], monster: head[2].trim() }); continue }
    if (headNoMon) { cur = Number(headNoMon[1]); out.set(cur, { words: [], monster: '' }); continue }
    if (cur === null) continue
    if (/^(#|---|\|)/.test(raw.trim())) continue
    const words = cleanWords(raw)
    if (words.length) out.get(cur)!.words.push(words)
  }
  return out
}

// Draw `n` bundles of `k` distinct words over a `win`-line window.
const drawBundles = (lines: string[][], n: number, k: number, win: number, rng: () => number): string[][] => {
  const bundles: string[][] = []
  let guard = 0
  while (bundles.length < n && guard++ < n * 60) {
    const start = Math.floor(rng() * Math.max(1, lines.length - Math.min(win, lines.length) + 1))
    const pool = [...new Set(lines.slice(start, start + win).flat())]
    if (pool.length < Math.min(k, 4)) continue
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1));[pool[i], pool[j]] = [pool[j], pool[i]] }
    bundles.push(pool.slice(0, Math.min(k, pool.length)).sort())
  }
  return bundles
}

interface MSection { n: number; role: string; tiers: number[] }
interface MDungeon { n: number; name: string; habitat: string; sections: MSection[] }
const manifest = JSON.parse(readFileSync('generated/manifest.json', 'utf8')) as { dungeons: MDungeon[] }

const SHORT_PER = 55, LONG_PER = 22
const drawDungeon = (d: MDungeon) => {
  const md = readFileSync(new URL(`${d.name}/campaign.md`, `file://${process.cwd()}/`), 'utf8')
  const parsed = parseSections(md)
  const rng = mulberry32(1000 + d.n)
  const sections = d.sections.map((s) => {
    const p = parsed.get(s.n) ?? { words: [], monster: '' }
    const shortTiers = s.tiers.filter((t) => t <= 9)
    const longTiers = s.tiers.filter((t) => t >= 10)
    return {
      n: s.n, role: s.role, monster: p.monster, tiers: s.tiers, shortTiers, longTiers,
      sourceLines: p.words.length,
      shortBundles: shortTiers.length ? drawBundles(p.words, SHORT_PER, 4, 3, rng).map((b) => b.join(' ')) : [],
      longBundles: longTiers.length ? drawBundles(p.words, LONG_PER, 18, 15, rng).map((b) => b.join(' ')) : [],
    }
  })
  mkdirSync('generated/draws', { recursive: true })
  writeFileSync(`generated/draws/${d.name}.json`, JSON.stringify({ dungeon: d.name, n: d.n, sections }, null, 2))
  return sections
}

const arg = process.argv[2] ?? 'all'
const targets = arg === 'all' ? manifest.dungeons : manifest.dungeons.filter((d) => d.name === arg)
if (!targets.length) { console.error(`no dungeon matches: ${arg}`); process.exit(1) }

console.log('DRAW')
for (const d of targets) {
  const sections = drawDungeon(d)
  console.log(`  D${d.n} ${d.name}`)
  for (const s of sections) {
    const bits = [
      s.shortBundles.length ? `${s.shortBundles.length} short` : '',
      s.longBundles.length ? `${s.longBundles.length} long` : '',
    ].filter(Boolean).join(' + ') || '—'
    console.log(`    §${s.n} ${(s.monster || s.role).padEnd(22)} t[${s.tiers.join(',')}]  ${s.sourceLines} lines → ${bits}`)
  }
}
