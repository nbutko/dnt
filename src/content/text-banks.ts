import type { PromptSource, Rng, TextBank, TextTier } from '../domain/types'
import library from './text/library.json'

// The whole shipped corpus — one bundle per build, keyed dungeon → tier → lines
// (content-pipeline/ship.ts). A richer bank is a bigger JSON, not a code change.
// Dungeon N carries its themed prose at tiers N..N+3; drills (T1-4) are folded
// in at the low dungeons. Sections were collapsed at ship time (regular §1-4 and
// boss §5 hold disjoint tiers), so selection here is purely (dungeon, tier).
interface Library {
  version: number
  dungeons: Record<string, Record<string, string[]>>
}
const { dungeons } = library as Library

// Global tier → union of that tier's lines across every dungeon — the fallback
// when a dungeon lacks the requested tier (an INT-capped served tier below the
// dungeon's own floor). Built once; every tier 1-14 is present (ship.ts asserts
// it), so a nearest-at-or-below walk always lands on real content.
const globalByTier = new Map<number, readonly string[]>()
for (const byTier of Object.values(dungeons)) {
  for (const [tier, lines] of Object.entries(byTier)) {
    const n = Number(tier)
    globalByTier.set(n, [...(globalByTier.get(n) ?? []), ...lines])
  }
}

// Resolve a (dungeon, tier) request to a concrete, non-empty line pool:
//   1. that dungeon's own lines at the exact tier (the themed, common case),
//   2. else every dungeon's lines at that exact tier (same difficulty, off-theme),
//   3. else the nearest easier tier globally (degrade down, never throw).
// Mirrors the old loader's "nearest bundled at-or-below" safety net, now that a
// gap can only open below a dungeon's floor rather than above the ladder's top.
const loadPool = async (dungeon: number, tier: TextTier): Promise<readonly string[]> => {
  const own = dungeons[String(dungeon)]?.[String(tier)]
  if (own && own.length) return own
  for (let t = tier; t >= 1; t -= 1) {
    const global = globalByTier.get(t)
    if (global && global.length) return global
  }
  // Unreachable given T1 is always present, but keeps the return total.
  return globalByTier.get(1) ?? []
}

// A picker that never serves the same line twice in a row (feedback #9). The
// first draw is uniform over all lines; every later draw samples uniformly over
// the pool *minus* the last line — mapping the index around the excluded slot,
// so it consumes exactly one rng value per call and never re-rolls. A lone-line
// pool has no alternative and just repeats.
const makePromptSource = async (dungeon: number, tier: TextTier, rng: Rng): Promise<PromptSource> => {
  const lines = await loadPool(dungeon, tier)
  let lastIndex = -1
  return () => {
    if (lines.length === 1) return lines[0]
    const span = lastIndex < 0 ? lines.length : lines.length - 1
    const choice = Math.floor(rng.next() * span)
    const index = lastIndex >= 0 && choice >= lastIndex ? choice + 1 : choice
    lastIndex = index
    return lines[index]
  }
}

const textBank: TextBank = { loadPool, makePromptSource }

export default textBank
