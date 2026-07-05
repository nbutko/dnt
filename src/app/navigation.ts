// The whole navigation layer for 4 screens on 1 device — no router library
// (see m2-implementation.html#state, "No router library"). GameShell holds
// one Screen and switches on it.
// Battles aren't a top-level screen: they're launched *inside* the dungeon
// screen (so the ephemeral run stays mounted) and hand their result back via a
// callback — see ui/dungeon/DungeonScreen.tsx.
export type Screen =
  | { name: 'map' }
  | { name: 'inn' }
  | { name: 'dungeon'; tier: number }

export const toMap = (): Screen => ({ name: 'map' })
export const toInn = (): Screen => ({ name: 'inn' })
export const toDungeon = (tier: number): Screen => ({ name: 'dungeon', tier })
