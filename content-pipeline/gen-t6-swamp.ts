/**
 * Swamp · T6 combinatorial generator (prototype). Run: `npx tsx gen-t6-swamp.ts`
 *
 * The campaign harvest gives us VOICE and a themed vocabulary; this turns that
 * vocabulary into VOLUME. T6 rules enforced: one leading capital, only ',' and
 * '.', no apostrophes, no digits, no shifted symbols, ~40 chars.
 *
 * Slot vocab is lifted straight from the Section-1 transcript + Swamp brief, so
 * the output stays on-theme instead of generic. Kept as a REJECTED baseline —
 * naive templates read mechanical (see content-plan-v2.html §3.2); the shipping
 * path is seed-and-compose. This exists to reproduce the volume/quality numbers.
 */

// Seedable PRNG (mulberry32) so runs are reproducible (Math.random isn't seedable).
const mulberry32 = (seed: number) => (): number => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const rng = mulberry32(7)
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)]

const ADJ = ['black', 'wet', 'cold', 'dark', 'rotted', 'still', 'quiet', 'hungry',
  'sunken', 'pale', 'silent', 'foul', 'drowned', 'grey']
const NOUN = ['bog', 'water', 'mud', 'muck', 'reeds', 'planks', 'boardwalk', 'cypress',
  'mist', 'torch', 'blade', 'dagger', 'teeth', 'chest', 'trail', 'fog']
const MON = ['mimic', 'hag', 'mummy', 'wight', 'serpent', 'hydra']
const VERB = ['lunges', 'hisses', 'waits', 'snaps', 'drips', 'groans', 'shifts', 'rises',
  'sinks', 'watches', 'lurks', 'stirs', 'coils', 'waits and watches']
const PLACE = ['in the bog', 'in the mud', 'under the planks', 'past the reeds',
  'in the mist', 'beneath the water', 'across the boardwalk', 'in the fog']

// Bront-deadpan pairs (short observation + verdict) — pre-built, on-voice.
const DEAD: readonly [string, string][] = [['Big lizard', 'Small boat'], ['Wet floor', 'Bad footing'],
  ['Dark water', 'Deep water'], ['No birds', 'No good'], ['Old chest', 'New teeth'],
  ['Quiet swamp', 'Loud trouble'], ['More mud', 'More waiting'], ['One bridge', 'Many gaps']]

const TEMPLATES: readonly (() => string)[] = [
  () => `The ${pick(ADJ)} ${pick(NOUN)} ${pick(VERB)}.`,
  () => `Something ${pick(VERB)} ${pick(PLACE)}.`,
  () => `The ${pick(MON)} ${pick(VERB)} ${pick(PLACE)}.`,
  () => `A ${pick(ADJ)} ${pick(NOUN)} sinks ${pick(PLACE)}.`,
  () => `The ${pick(NOUN)} is ${pick(ADJ)} and ${pick(ADJ)}.`,
  () => `The ${pick(MON)} is ${pick(ADJ)}.`,
  () => { const d = pick(DEAD); return `${d[0]}. ${d[1]}.` },
  () => `The ${pick(NOUN)} ${pick(VERB)} ${pick(PLACE)}.`,
]

const t6Legal = (s: string): boolean => {
  if (!/^[A-Za-z ,.]+$/.test(s)) return false // only letters/space/,/.
  if (s.length < 20 || s.length > 45) return false // T6 length window
  for (const sent of s.replace(/^[.\s]+|[.\s]+$/g, '').split(/\.\s*/)) {
    if (!sent) continue
    if (sent[0] !== sent[0].toUpperCase()) return false // sentence-start capital
    if ([...sent.slice(1)].some((c) => c !== c.toLowerCase())) return false // no mid caps
  }
  return true
}

const seen = new Set<string>()
for (let i = 0; i < 20000; i++) {
  const line = pick(TEMPLATES)().replace(/\s+/g, ' ').trim()
  if (t6Legal(line)) seen.add(line)
}

const lines = [...seen].sort()
console.log(`UNIQUE VIABLE T6 LINES: ${lines.length}`)
console.log('theoretical ceiling (slot product, rough):',
  ADJ.length * NOUN.length * VERB.length + MON.length * VERB.length * PLACE.length + DEAD.length)
console.log('\n--- 18-line sample ---')
for (let i = 0; i < 18; i++) console.log('  ', pick(lines))
