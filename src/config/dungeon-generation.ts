// Per-segment knobs for the two-fan-out dungeon generator — the tuning surface
// the scope flags as a playtesting knob (m2-scope.html#dungeon-structure), kept
// as data so retuning "how big is a dungeon" never touches generate.ts.
//
// The ranges are inclusive [min, max]; the generator rolls each one per
// dungeon. They're chosen so the scope's invariants hold for *every* roll, not
// just on average:
//
//   shortest path = shortestEarlyPath + waypoint + shortestLatePath + approach
//                 = earlyLen.min + 1 + lateLen.min + 1 = 2 + 1 + 3 + 1 = 7   (min)
//                 = 4 + 1 + 5 + 1 = 11 at the extreme, but the shortest of
//                   several paths pulls it back — see the invariant sim, which
//                   holds the realized shortest to 7-10.
//
//   total (excl. mimics) = sum of every path + waypoint + approach + boss.
//     With 2-4 early paths of 2-4 and 2-4 late paths of 3-5, the raw envelope
//     is wide; targetTotal clamps the generator to re-roll until it lands in
//     the 26-34 band, so the knobs below only need to make that band reachable.
export interface DungeonGenerationConfig {
  earlyPaths: [number, number]
  earlyPathLen: [number, number]
  latePaths: [number, number]
  latePathLen: [number, number]
  chests: [number, number]
  // The generator re-rolls path counts/lengths until the regular-monster total
  // (waypoint + approach + boss included, mimics excluded) lands in this band.
  // A generous envelope above makes this reachable; this is the actual scope
  // constraint (~30, 26-34 fine).
  targetTotal: [number, number]
  // Hard bounds the invariant sim asserts and the generator guarantees.
  shortestPath: [number, number]
}

const dungeonGenerationConfig: DungeonGenerationConfig = {
  earlyPaths: [2, 4],
  earlyPathLen: [2, 4],
  latePaths: [2, 4],
  latePathLen: [3, 5],
  chests: [3, 5],
  targetTotal: [26, 34],
  shortestPath: [7, 10],
}

export default dungeonGenerationConfig
