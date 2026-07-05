// The single source of truth for cleared/available/locked styling — reused
// unchanged by world-map tiles, dungeon nodes, and skill-tree nodes (see
// m2-implementation.html#node-language). A tweak to "what locked looks like"
// happens once here, not in three drifting copies.
export type NodeVisualState = 'cleared' | 'available' | 'locked'

// `family` swaps the gold (player/progress) treatment for the danger (red)
// one — used only by the boss node and the Urban tier card, which stay
// red-tinted even while locked so they read as "the big one" regardless of
// state (docs/design/README.md §3).
export type NodeFamily = 'gold' | 'danger'

// Square tier/graph nodes use a diagonal gradient when cleared; round nodes
// (skill tree) use the same radial fill as Legend's circle swatch — same
// palette, shape-appropriate direction.
export type NodeShape = 'square' | 'circle'

export interface NodeStateClasses {
  container: string
  label: string
}

const GOLD_CLEARED_FILL: Record<NodeShape, string> = {
  square: 'bg-gradient-to-br from-node-cleared-from to-node-cleared-to',
  circle: 'bg-[radial-gradient(circle_at_35%_30%,#e8c766,#8a6a1a)]',
}

const gold = (shape: NodeShape): Record<NodeVisualState, NodeStateClasses> => ({
  cleared: {
    container: `border-2 border-accent-gold ${GOLD_CLEARED_FILL[shape]} shadow-[0_0_12px_#c9a22766]`,
    label: 'text-accent-gold-bright',
  },
  available: {
    container: 'border-2 border-accent-gold-bright bg-panel-base shadow-[0_0_12px_#e8c76677]',
    label: 'text-accent-gold-bright',
  },
  locked: {
    // Solid (not translucent) background — locked nodes sit over a
    // connector line (world map trail, dungeon graph edges) and must fully
    // occlude it rather than let it bleed through.
    container: 'border border-dashed border-node-locked-border bg-node-locked-solid',
    label: 'text-node-locked-text',
  },
})

const DANGER: Record<NodeVisualState, NodeStateClasses> = {
  cleared: {
    container:
      'border-2 border-danger-bright bg-gradient-to-br from-danger to-danger-bright shadow-[0_0_12px_#c94b4b66]',
    label: 'text-danger-bright',
  },
  available: {
    container: 'border-2 border-danger-bright bg-panel-monster-to shadow-[0_0_12px_#c94b4b77]',
    label: 'text-danger-bright',
  },
  locked: {
    container:
      'border border-dashed border-node-danger-locked-border bg-node-danger-locked-solid',
    label: 'text-node-danger-locked-text',
  },
}

export const nodeStateClasses = (
  state: NodeVisualState,
  family: NodeFamily = 'gold',
  shape: NodeShape = 'square',
): NodeStateClasses => (family === 'gold' ? gold(shape) : DANGER)[state]
