// Turns an encounter-roll band into the tier of text the player is actually
// served this fight (m3-implementation.html finding C) — the load-bearing use
// of config/dungeon-tiers.ts's previously-dead textTierRange field.

import type { TextTier } from '../../domain/types'
import type { EncounterBand } from './encounter-roll'

export interface ServedTierResult {
  // The tier the band rolled into — bottom/mid/top of the dungeon's window.
  targetTier: TextTier
  // What the player is actually served. INT no longer caps it (the tier cap
  // retired — content-plan-v2-tuning.html), so this now always equals
  // targetTier; kept as a distinct field so the gate-penalty slot (and the
  // planned tier-reward) still have a servedTier/targetTier pair to read.
  servedTier: TextTier
}

// Low -> the bottom of the dungeon's range, high -> the top, mid -> the
// (rounded) midpoint — "read straight off each dungeon's textTierRange...
// Low = bottom of the range, high = top" (m3-scope.html#encounter-roll).
export const bandToServedTier = (
  band: EncounterBand,
  textTierRange: readonly [TextTier, TextTier],
): ServedTierResult => {
  const [low, high] = textTierRange
  let targetTier: TextTier = Math.round((low + high) / 2) as TextTier
  if (band === 'low') targetTier = low
  if (band === 'high') targetTier = high
  return { targetTier, servedTier: targetTier }
}
