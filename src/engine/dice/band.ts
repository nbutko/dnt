// Turns an encounter-roll band into the tier of text the player is actually
// served this fight (m3-implementation.html finding C) — the load-bearing use
// of config/dungeon-tiers.ts's previously-dead textTierRange field.

import type { TextTier } from '../../domain/types'
import type { EncounterBand } from './encounter-roll'

export interface ServedTierResult {
  // What the band rolled into, before any INT cap — the gate-target tier
  // engine/damage.ts's tierGatePenalty compares the served tier against
  // (finding D).
  targetTier: TextTier
  // What the player is actually served: targetTier capped by intTierCap.
  servedTier: TextTier
}

// Low -> the bottom of the dungeon's range, high -> the top, mid -> the
// (rounded) midpoint — "read straight off each dungeon's textTierRange...
// Low = bottom of the range, high = top" (m3-scope.html#encounter-roll).
export const bandToServedTier = (
  band: EncounterBand,
  textTierRange: readonly [TextTier, TextTier],
  intTierCap: TextTier,
): ServedTierResult => {
  const [low, high] = textTierRange
  let targetTier: TextTier = Math.round((low + high) / 2) as TextTier
  if (band === 'low') targetTier = low
  if (band === 'high') targetTier = high
  const servedTier = Math.min(targetTier, intTierCap) as TextTier
  return { targetTier, servedTier }
}
