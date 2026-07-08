/**
 * Drill-tier generator (T1–4) — reusable module + standalone builder.
 *
 * The "free" (no-LLM) half of the pipeline — content-plan-v2.html §3.3 / §7.1.
 * T1–3 are keyboard-restricted (home row / left hand / right hand); T4 is
 * full-keyboard 3-5 word phrases. (T5 lowercase sentences moved to compose —
 * templated sentences read too formulaic.)
 *
 * Two consumers:
 *   • `merge.ts` imports { genDrill } to fill a dungeon's drill cells with a
 *     per-(dungeon×section×tier) seed, so the same tier reads differently in
 *     different early stages (a bit of variety, and uniform per-dungeon files).
 *   • run directly (`npx tsx drill-gen.ts`) to (re)emit the shared
 *     generated/drills/tier-0N.json snapshots + a per-letter coverage audit.
 *
 * Word banks are hand-curated and legible (no dictionary sludge — a 10-year-old
 * shouldn't drill "gaffs"), with uncommon letters (j/q/z/x/v/y/k) seeded on par
 * with common ones so every finger gets worked. T2 can't spell real q-words
 * without the (right-hand) u, so it uses made-up left-hand q/z tokens.
 * Punctuation is *injected* onto ~1-in-20 words at the reachable tiers: `;` and
 * `'` on the home row (T1), and `;',./` on the right hand (T3).
 */
import { writeFileSync, mkdirSync } from 'node:fs'

// Seedable PRNG so every batch is reproducible (Math.random is banned in the
// workflow sandbox and non-reproducible anyway).
export const mulberry32 = (seed: number) => (): number => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
type Rng = () => number
const pick = <T>(xs: readonly T[], rng: Rng): T => xs[Math.floor(rng() * xs.length)]

// ── Keyboard-restricted word banks (T1–3) ───────────────────────────────────
// T1 home row (a s d f g h j k l) — j/k seeded to par with the vowel a.
const HOME = ['dad', 'sad', 'lad', 'had', 'has', 'gas', 'ask', 'all', 'gal', 'lag',
  'hag', 'jag', 'jak', 'jaks', 'jags', 'haj', 'hajj', 'fad', 'aha', 'alas', 'fall',
  'gall', 'hall', 'half', 'flag', 'flags', 'gash', 'hash', 'dash', 'lash', 'gaff',
  'gala', 'flask', 'flasks', 'glass', 'salad', 'shall', 'skald', 'skalds', 'asks', 'halls']
// T2 left hand (q w e r t a s d f g z x c v b) — the only vowels reachable are
// a/e, so real q-words are impossible; QZ is a made-up bank that seeds q & z.
const LEFT = ['cat', 'bat', 'rat', 'sat', 'fat', 'vat', 'tea', 'sea', 'wet', 'get',
  'set', 'bet', 'vet', 'red', 'bed', 'fed', 'wed', 'bad', 'tab', 'cab', 'dab', 'art',
  'cart', 'dart', 'tart', 'star', 'scar', 'brag', 'drag', 'grab', 'crab', 'drab',
  'stab', 'swab', 'brave', 'grave', 'crave', 'crate', 'grate', 'state', 'waste',
  'taste', 'water', 'sweat', 'treat', 'feast', 'beast', 'great', 'dread', 'bread',
  'tread', 'extra', 'exact', 'vast', 'vase', 'verb', 'wave', 'cave', 'gave', 'save']
// Left-hand-legal q/z tokens (some real — zed/zag/zax/daze/graze — most made up).
const QZ = ['zed', 'zag', 'zax', 'daze', 'faze', 'gaze', 'raze', 'adze', 'craze',
  'graze', 'braze', 'zest', 'zebra', 'zeds', 'zags', 'qat', 'qart', 'qest', 'zaq',
  'qaz', 'req', 'saq', 'taq', 'vaq', 'qeb', 'garq', 'zarq', 'verq', 'darq', 'zart']
const T2BANK = [...LEFT, ...QZ, ...QZ] // ~48% draws from QZ → q/z land on par
// T3 right hand (y u i o p h j k l n m) — j/k/y seeded; punctuation injected.
const RIGHT = ['you', 'him', 'hip', 'hop', 'mom', 'mop', 'nun', 'pin', 'pun', 'kin',
  'ink', 'oink', 'join', 'loin', 'lion', 'moon', 'noon', 'milk', 'hill', 'pill', 'mill',
  'kill', 'holly', 'jolly', 'pony', 'only', 'upon', 'onion', 'opium', 'hymn', 'hunk',
  'junk', 'monk', 'look', 'hook', 'nook', 'pool', 'loop', 'hoop', 'honk', 'kilo', 'holy',
  'imply', 'jump', 'plum', 'plump', 'pump', 'lump', 'hump', 'phony']

// ── Full-keyboard bank (T4) ──────────────────────────────────────────────────
// Every letter a–z appears here (rare letters carried by dedicated words below);
// the standalone audit fails loudly if any drops out.
const VERB = ['grab', 'run', 'open', 'find', 'guard', 'chase', 'dodge', 'cast', 'swing',
  'block', 'climb', 'throw', 'drink', 'search', 'take', 'ring', 'lift', 'drop', 'hide',
  'jump', 'join', 'vex', 'hex', 'fix', 'mix', 'quaff', 'unlock', 'zap']
const NOUN = ['loot', 'gold', 'chest', 'door', 'cave', 'sword', 'shield', 'potion',
  'torch', 'dragon', 'goblin', 'wizard', 'knight', 'dagger', 'map', 'key', 'gate',
  'bridge', 'trap', 'coin', 'ogre', 'slime', 'rope', 'boots', 'crown', 'ruby', 'scroll',
  'axe', 'jewel', 'jail', 'jester', 'fox', 'hydra', 'quiver', 'quartz', 'zombie', 'maze',
  'vault', 'skull', 'kobold', 'oxen']
const ADJ = ['dark', 'cold', 'old', 'rusty', 'magic', 'sharp', 'heavy', 'brave', 'sneaky',
  'hidden', 'cursed', 'golden', 'broken', 'giant', 'tiny', 'ancient', 'silver', 'quiet',
  'jagged', 'quick', 'frozen', 'waxy', 'zany', 'vast', 'foxy']
const T4: readonly ((rng: Rng) => string)[] = [
  (r) => `${pick(VERB, r)} the ${pick(NOUN, r)}`,
  (r) => `${pick(VERB, r)} for the ${pick(NOUN, r)}`,
  (r) => `open the ${pick(ADJ, r)} ${pick(NOUN, r)}`,
  (r) => `${pick(ADJ, r)} ${pick(NOUN, r)} and ${pick(NOUN, r)}`,
  (r) => `${pick(VERB, r)} the ${pick(ADJ, r)} ${pick(NOUN, r)}`,
]

// Punctuation injection: each word has an independent ~1-in-20 chance of picking
// up one mark. `;` trails the word; `'` either quotes it ('word') or makes it
// possessive (word's); `,`/`.` trail; `/` joins to the next word (you/him).
interface Punct { semicolon?: boolean; apostrophe?: boolean; comma?: boolean; period?: boolean; slash?: boolean }
const decorate = (word: string, rng: Rng, cfg: Punct): string => {
  if (cfg.semicolon && rng() < 0.05) return `${word};`
  if (cfg.apostrophe && rng() < 0.05) return rng() < 0.5 ? `'${word}'` : `${word}'s`
  if (cfg.comma && rng() < 0.05) return `${word},`
  if (cfg.period && rng() < 0.04) return `${word}.`
  return word
}
const buildLine = (bank: readonly string[], min: number, max: number, rng: Rng, cfg: Punct): string => {
  let s = ''
  for (let guard = 0; guard < 14 && s.length < min; guard++) {
    const w = decorate(pick(bank, rng), rng, cfg)
    const sep = cfg.slash && s && rng() < 0.04 ? '/' : ' '
    const next = s ? `${s}${sep}${w}` : w
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
  make: (rng: Rng) => string
  rare: readonly string[] // chars we insist show up (audited)
}
export const DRILL_SPECS: readonly TierSpec[] = [
  { tier: 1, legal: /^[asdfghjkl ;']+$/, min: 15, max: 40, rare: ['j', 'k', ';', "'"],
    make: (r) => buildLine(HOME, 15, 40, r, { semicolon: true, apostrophe: true }) },
  { tier: 2, legal: /^[qwertasdfgzxcvb ]+$/, min: 25, max: 45, rare: ['q', 'z', 'x', 'v'],
    make: (r) => buildLine(T2BANK, 25, 45, r, {}) },
  { tier: 3, legal: /^[yuiophjklnm ;',./]+$/, min: 25, max: 45, rare: ['j', 'k', 'y', ';', "'", ',', '.', '/'],
    make: (r) => buildLine(RIGHT, 25, 45, r, { semicolon: true, apostrophe: true, comma: true, period: true, slash: true }) },
  { tier: 4, legal: /^[a-z ]+$/, min: 12, max: 30, rare: ['j', 'q', 'x', 'z', 'v', 'k'],
    make: (r) => pick(T4, r)(r) },
]

/** Generate `count` distinct legal drill lines for a tier from a given seed. */
export const genDrill = (tier: number, count: number, seed: number): string[] => {
  const spec = DRILL_SPECS.find((s) => s.tier === tier)
  if (!spec) throw new Error(`no drill spec for tier ${tier}`)
  const rng = mulberry32(seed)
  const seen = new Set<string>()
  const out: string[] = []
  for (let i = 0; i < count * 400 && out.length < count; i++) {
    const s = spec.make(rng).replace(/[ ]{2,}/g, ' ').trim()
    if (s.length < spec.min || s.length > spec.max) continue
    if (!spec.legal.test(s)) continue
    const key = s.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key); out.push(s)
  }
  return out
}

// ── Standalone builder + coverage audit ──────────────────────────────────────
// Only runs when invoked directly, so `merge.ts` can import genDrill cleanly.
if (process.argv[1]?.endsWith('drill-gen.ts')) {
  mkdirSync('generated/drills', { recursive: true })
  console.log('DRILL TIERS (target ≥100 each) — per-letter coverage audited\n')
  let anyThin = false
  for (const spec of DRILL_SPECS) {
    const lines = genDrill(spec.tier, 140, 20260707 + spec.tier).sort()
    writeFileSync(`generated/drills/tier-0${spec.tier}.json`, JSON.stringify({ tier: spec.tier, lines }, null, 2))

    const n = lines.length
    const pct = (ch: string): number => Math.round((lines.filter((l) => l.includes(ch)).length / n) * 100)
    // Legal letters for this tier (strip the char class of spaces/punctuation).
    const legalLetters = [...'abcdefghijklmnopqrstuvwxyz'].filter((c) => spec.legal.test(c))
    const missing = legalLetters.filter((c) => pct(c) === 0)
    const thin = legalLetters.filter((c) => pct(c) > 0 && pct(c) < 8)
    const rareCov = spec.rare.map((c) => `${c === ' ' ? '␠' : c}:${pct(c)}%`).join(' ')

    console.log(`T${spec.tier}: ${n} lines   [rare ${rareCov}]`)
    if (missing.length) { console.log(`     ✗ MISSING letters: ${missing.join(' ')}`); anyThin = true }
    if (thin.length) { console.log(`     · thin (<8%): ${thin.map((c) => `${c}:${pct(c)}%`).join(' ')}`); anyThin = true }
    const rng = mulberry32(99 + spec.tier)
    console.log(`     e.g.  ${[...lines].sort(() => rng() - 0.5).slice(0, 4).join('  |  ')}\n`)
  }
  console.log(anyThin ? '⚠ some letters missing/thin — adjust banks' : '✓ every legal letter well-represented in every tier')
}
