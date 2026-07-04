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

const loadTier = async (tier: TextTier): Promise<readonly string[]> => {
  const file = bundledTiers[tier]
  if (!file) {
    throw new Error(`No text bank bundled for tier ${tier}`)
  }
  return file.lines
}

const makePromptSource = async (tier: TextTier, rng: Rng): Promise<PromptSource> => {
  const lines = await loadTier(tier)
  return () => lines[Math.floor(rng.next() * lines.length)]
}

const textBank: TextBank = { loadTier, makePromptSource }

export default textBank
