import type { DungeonNode as DungeonNodeData, NodeKind } from '../../domain/dungeon'
import { nodeStateClasses, type NodeFamily, type NodeShape } from '../common/nodeState'

interface DungeonNodeProps {
  node: DungeonNodeData
  x: number
  y: number
  onSelect: (id: string) => void
}

interface KindStyle {
  size: number
  shape: 'circle' | 'diamond'
  family: NodeFamily
  ring: boolean // the double-ring treatment for the two chokepoints
  caption?: string
}

// Per-kind geometry from design/README.md §3 (node shapes/sizes). The boss uses
// the danger family so it stays red-tinted even while locked; everything else
// is the gold progress family. Chests are diamonds and — crucially — carry no
// real/mimic distinction here, so they render identically until opened.
const KIND: Record<NodeKind, KindStyle> = {
  entrance: { size: 34, shape: 'diamond', family: 'gold', ring: false, caption: 'Start' },
  fight: { size: 40, shape: 'circle', family: 'gold', ring: false },
  waypoint: { size: 56, shape: 'circle', family: 'gold', ring: true, caption: 'Waypoint' },
  approach: { size: 56, shape: 'circle', family: 'gold', ring: true, caption: 'Approach' },
  boss: { size: 64, shape: 'circle', family: 'danger', ring: false, caption: 'Boss' },
  chest: { size: 22, shape: 'diamond', family: 'gold', ring: false },
}

// The glyph shown inside a node: the entrance is a "go" marker, a cleared node
// gets the shared ✓, an unbeaten boss shows a skull; everything else is bare
// (its shape + state colour already read clearly).
const glyphFor = (node: DungeonNodeData): string => {
  if (node.kind === 'entrance') return '▸'
  if (node.state === 'cleared') return '✓'
  if (node.kind === 'boss') return '☠'
  return ''
}

const DungeonNode = ({ node, x, y, onSelect }: DungeonNodeProps) => {
  const style = KIND[node.kind]
  const shape: NodeShape = style.shape === 'circle' ? 'circle' : 'square'
  const classes = nodeStateClasses(node.state, style.family, shape)
  const clickable = node.state === 'available'
  const glyph = glyphFor(node)
  const glyphSize = style.size >= 56 ? 'text-lg' : 'text-[11px]'

  return (
    <div className="absolute z-[1] -translate-x-1/2 -translate-y-1/2" style={{ left: x, top: y }}>
      <button
        type="button"
        disabled={!clickable}
        onClick={() => onSelect(node.id)}
        aria-label={`${node.kind}${style.caption ? ` (${style.caption})` : ''} — ${node.state}`}
        className={`relative flex items-center justify-center ${
          style.shape === 'circle' ? 'rounded-full' : 'rotate-45 rounded-[4px]'
        } ${classes.container} ${clickable ? 'cursor-pointer hover:brightness-110' : 'cursor-default'}`}
        style={{ width: style.size, height: style.size }}
      >
        {/* Double ring for the two chokepoints — a sibling span whose spread
            box-shadow draws outside the node without clobbering the node's own
            state glow (design/README.md §3). */}
        {style.ring && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_4px_rgba(201,162,39,0.25)]"
          />
        )}
        {glyph && (
          <span
            className={`font-display font-bold ${glyphSize} ${classes.label} ${
              style.shape === 'diamond' ? '-rotate-45' : ''
            }`}
          >
            {glyph}
          </span>
        )}
      </button>
      {style.caption && (
        <span className="absolute top-full left-1/2 mt-1 -translate-x-1/2 font-mono text-[9px] tracking-wide whitespace-nowrap text-text-dim uppercase">
          {style.caption}
        </span>
      )}
    </div>
  )
}

export default DungeonNode
