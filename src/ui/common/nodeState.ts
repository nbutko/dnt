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

export interface NodeStateClasses {
  container: string
  label: string
}

const GOLD: Record<NodeVisualState, NodeStateClasses> = {
  cleared: {
    container:
      'border-2 border-accent-gold bg-gradient-to-br from-node-cleared-from to-node-cleared-to shadow-[0_0_12px_#c9a22766]',
    label: 'text-accent-gold-bright',
  },
  available: {
    container: 'border-2 border-accent-gold-bright bg-panel-base shadow-[0_0_12px_#e8c76677]',
    label: 'text-accent-gold-bright',
  },
  locked: {
    container: 'border border-dashed border-node-locked-border bg-node-locked opacity-55',
    label: 'text-node-locked-text',
  },
}

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
      'border border-dashed border-node-danger-locked-border bg-node-danger-locked opacity-60',
    label: 'text-node-danger-locked-text',
  },
}

const FAMILIES: Record<NodeFamily, Record<NodeVisualState, NodeStateClasses>> = {
  gold: GOLD,
  danger: DANGER,
}

export const nodeStateClasses = (
  state: NodeVisualState,
  family: NodeFamily = 'gold',
): NodeStateClasses => FAMILIES[family][state]
