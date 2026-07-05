import type { PromptSource, Rng, TextBank, TextTier } from '../domain/types'
import tier01 from './text/tier-01.json'
import tier02 from './text/tier-02.json'

interface TierFile {
  tier: number
  lines: readonly string[]
}

// M0 ships tiers 1-2, bundled at build time. A new tier is a new JSON file
// plus one entry here — content, not code.
const bundledTiers: Partial<Record<TextTier, TierFile>> = {
  1: tier01,
  2: tier02,
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

const makePromptSource = async (tier: TextTier, rng: Rng): Promise<PromptSource> => {
  const lines = await loadTier(tier)
  return () => lines[Math.floor(rng.next() * lines.length)]
}

const textBank: TextBank = { loadTier, makePromptSource }

export default textBank
