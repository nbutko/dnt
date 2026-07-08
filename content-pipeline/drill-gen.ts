/**
 * Drill-tier generator (T1–4). Run: `npx tsx drill-gen.ts`
 *
 * The "free" (no-LLM) half of the pipeline — content-plan-v2.html §3.3 / §7.1.
 * T1–3 are keyboard-restricted (home row / left hand / right hand); T4 is
 * full-keyboard 3-5 word phrases. (T5 lowercase sentences moved to compose —
 * templated sentences read too formulaic.) Word banks are hand-curated and legible (no
 * dictionary sludge — a 10-year-old shouldn't drill "gaffs"), with rare letters
 * (j/q/z/x/v/y/k) deliberately seeded where each tier's key set allows.
 *
 * Output → generated/drills/tier-0N.json (staging; does NOT touch shipped content).
 */
import { writeFileSync, mkdirSync } from 'node:fs'

// Seedable PRNG so the batch is reproducible.
const mulberry32 = (seed: number) => (): number => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const rng = mulberry32(20260707)
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)]

// ── Keyboard-restricted word banks (T1–3) ───────────────────────────────────
// T1 home row (a s d f g h j k l).
const HOME = ['dad', 'sad', 'lad', 'had', 'has', 'gas', 'ask', 'all', 'gal', 'lag',
  'hag', 'jag', 'fad', 'aha', 'alas', 'fall', 'gall', 'hall', 'half', 'flag', 'gash',
  'hash', 'dash', 'lash', 'gaff', 'gala', 'flask', 'glass', 'salad', 'shall', 'jak']
// T2 left hand (q w e r t a s d f g z x c v b) — seeds z/x/v.
const LEFT = ['cat', 'bat', 'rat', 'sat', 'fat', 'vat', 'tea', 'sea', 'wet', 'get',
  'set', 'bet', 'vet', 'red', 'bed', 'fed', 'wed', 'bad', 'tab', 'cab', 'dab', 'art',
  'cart', 'dart', 'tart', 'star', 'scar', 'brag', 'drag', 'grab', 'crab', 'drab',
  'stab', 'swab', 'brave', 'grave', 'crave', 'crate', 'grate', 'state', 'waste',
  'taste', 'water', 'sweat', 'treat', 'feast', 'beast', 'great', 'dread', 'bread',
  'tread', 'extra', 'exact', 'vast', 'vase', 'verb', 'wave', 'cave', 'gave', 'save',
  'zest', 'zebra', 'vex', 'text']
// T3 right hand (y u i o p h j k l n m) — seeds j/k/y.
const RIGHT = ['you', 'him', 'hip', 'hop', 'mom', 'mop', 'nun', 'pin', 'pun', 'kin',
  'ink', 'oink', 'join', 'loin', 'lion', 'moon', 'noon', 'milk', 'hill', 'pill', 'mill',
  'kill', 'holly', 'jolly', 'pony', 'only', 'upon', 'onion', 'opium', 'hymn', 'hunk',
  'junk', 'monk', 'look', 'hook', 'nook', 'pool', 'loop', 'hoop', 'honk', 'kilo', 'holy',
  'imply', 'jump', 'plum', 'plump', 'pump', 'lump', 'hump', 'phony']

// ── Full-keyboard bank (T4–5) ────────────────────────────────────────────────
const VERB = ['grab', 'run', 'open', 'find', 'guard', 'chase', 'dodge', 'cast', 'swing',
  'block', 'climb', 'throw', 'drink', 'search', 'take', 'ring', 'lift', 'drop', 'hide']
const NOUN = ['loot', 'gold', 'chest', 'door', 'cave', 'sword', 'shield', 'potion',
  'torch', 'dragon', 'goblin', 'wizard', 'knight', 'dagger', 'map', 'key', 'gate',
  'bridge', 'trap', 'coin', 'ogre', 'slime', 'rope', 'boots', 'crown', 'ruby', 'scroll', 'axe']
const ADJ = ['dark', 'cold', 'old', 'rusty', 'magic', 'sharp', 'heavy', 'brave', 'sneaky',
  'hidden', 'cursed', 'golden', 'broken', 'giant', 'tiny', 'ancient', 'silver', 'quiet']
const T4 = [
  () => `${pick(VERB)} the ${pick(NOUN)}`,
  () => `${pick(VERB)} for the ${pick(NOUN)}`,
  () => `open the ${pick(ADJ)} ${pick(NOUN)}`,
  () => `${pick(ADJ)} ${pick(NOUN)} and ${pick(NOUN)}`,
  () => `${pick(VERB)} the ${pick(ADJ)} ${pick(NOUN)}`,
]

const wordRun = (bank: readonly string[], min: number, max: number): string => {
  let s = ''
  for (let guard = 0; guard < 12 && s.length < min; guard++) {
    const w = pick(bank)
    const next = s ? `${s} ${w}` : w
    if (next.length > max) break
    s = next
  }
  return s
}

interface TierSpec {
  tier: number
  legal: RegExp
  min: number
  max: number
  make: () => string
  rare: readonly string[] // letters we want to see practiced
}
const SPECS: readonly TierSpec[] = [
  { tier: 1, legal: /^[asdfghjkl ]+$/, min: 15, max: 40, make: () => wordRun(HOME, 15, 40), rare: ['j', 'k'] },
  { tier: 2, legal: /^[qwertasdfgzxcvb ]+$/, min: 25, max: 45, make: () => wordRun(LEFT, 25, 45), rare: ['z', 'x', 'v'] },
  { tier: 3, legal: /^[yuiophjklnm ]+$/, min: 25, max: 45, make: () => wordRun(RIGHT, 25, 45), rare: ['j', 'k', 'y'] },
  { tier: 4, legal: /^[a-z ]+$/, min: 12, max: 30, make: () => pick(T4)(), rare: ['k', 'v', 'x'] },
]

mkdirSync('generated/drills', { recursive: true })
console.log('DRILL TIERS (target ≥100 each)\n')
for (const spec of SPECS) {
  const seen = new Set<string>()
  for (let i = 0; i < 8000 && seen.size < 140; i++) {
    const s = spec.make().replace(/\s+/g, ' ').trim()
    if (s.length < spec.min || s.length > spec.max) continue
    if (!spec.legal.test(s)) continue
    seen.add(s)
  }
  const lines = [...seen].sort()
  writeFileSync(`generated/drills/tier-0${spec.tier}.json`, JSON.stringify({ tier: spec.tier, lines }, null, 2))
  const coverage = spec.rare.map((r) => `${r}:${lines.some((l) => l.includes(r)) ? '✓' : '✗'}`).join(' ')
  const sample = [...lines].sort(() => rng() - 0.5).slice(0, 4).join('  |  ')
  console.log(`T${spec.tier}: ${lines.length} lines  [rare ${coverage}]`)
  console.log(`     ${sample}\n`)
}
