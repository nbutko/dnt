import type { PromptSource, Rng, TextBank, TextTier } from '../domain/types'
import tier01 from './text/tier-01.json'
import tier02 from './text/tier-02.json'
import tier03 from './text/tier-03.json'
import tier04 from './text/tier-04.json'
import tier05 from './text/tier-05.json'
import tier06 from './text/tier-06.json'
import tier07 from './text/tier-07.json'
import tier08 from './text/tier-08.json'
import tier09 from './text/tier-09.json'
import tier10 from './text/tier-10.json'

interface TierFile {
  tier: number
  lines: readonly string[]
}

// Story 7 seeds all 10 text tiers, bundled at build time. A richer bank is a
// bigger JSON file, not a code change — the fallback below still covers any
// gap that opens up if a future tier is requested ahead of its content.
const bundledTiers: Partial<Record<TextTier, TierFile>> = {
  1: tier01,
  2: tier02,
  3: tier03,
  4: tier04,
  5: tier05,
  6: tier06,
  7: tier07,
  8: tier08,
  9: tier09,
  10: tier10,
}

// A gap in bundled content degrades to the nearest easier tier instead of
// throwing (m2-implementation.html finding A) — a permanent safety net, not
// just a stopgap until Story 7's seed banks land, since a future tier could
// always be requested ahead of its content being authored. Tier 1 is always
// bundled, so there's always at least one candidate at or below any request.
const loadTier = async (tier: TextTier): Promise<readonly string[]> => {
  const bundledAtOrBelow = Object.keys(bundledTiers)
    .map(Number)
    .filter((candidate) => candidate <= tier)
  const resolvedTier = Math.max(...bundledAtOrBelow) as TextTier
  return bundledTiers[resolvedTier]!.lines
}

// A picker that never serves the same line twice in a row (feedback #9). The
// first draw is uniform over all lines; every later draw samples uniformly over
// the pool *minus* the last line — mapping the index around the excluded slot,
// so it consumes exactly one rng value per call and never re-rolls. This relies
// on every tier having ≥2 lines (guarded by the test); a lone-line tier would
// have no alternative and just repeats.
const makePromptSource = async (tier: TextTier, rng: Rng): Promise<PromptSource> => {
  const lines = await loadTier(tier)
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

const textBank: TextBank = { loadTier, makePromptSource }

export default textBank
