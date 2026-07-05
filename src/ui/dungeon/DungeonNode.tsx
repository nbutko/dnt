import { getMonster } from '../../content/monsters'
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

// The glyph shown inside a node: the entrance is a "go" marker, an unbeaten
// boss shows a skull, and a cleared node gets the shared ✓ — except a cleared
// chest, which reveals what it was after the fact (feedback #3): a real chest
// keeps the ✓, a defeated mimic shows a ✗. Everything else is bare (its shape +
// state colour already read clearly). Unopened chests stay identical — this
// only branches once state === 'cleared', so it leaks nothing.
const glyphFor = (node: DungeonNodeData): string => {
  if (node.kind === 'entrance') return '▸'
  if (node.state === 'cleared') {
    if (node.kind === 'chest') return node.isRealChest ? '✓' : '✗'
    return '✓'
  }
  if (node.kind === 'boss') return '☠'
  return ''
}

// A cleared mimic's ✗ reads red rather than the chest's gold — the only case
// where the glyph colour diverges from the node's own state colour.
const isRevealedMimic = (node: DungeonNodeData): boolean =>
  node.kind === 'chest' && node.state === 'cleared' && !node.isRealChest

// Which monster a node holds, for its identity label (feedback #8) — but never
// for a chest, whose real/mimic identity must stay hidden until opened, so a
// mimic's monsterId can't leak through a caption or tooltip.
const monsterNameFor = (node: DungeonNodeData): string | undefined =>
  node.kind !== 'chest' && node.monsterId ? getMonster(node.monsterId).name : undefined

const DungeonNode = ({ node, x, y, onSelect }: DungeonNodeProps) => {
  const style = KIND[node.kind]
  const shape: NodeShape = style.shape === 'circle' ? 'circle' : 'square'
  const classes = nodeStateClasses(node.state, style.family, shape)
  const clickable = node.state === 'available'
  const glyph = glyphFor(node)
  const glyphSize = style.size >= 56 ? 'text-lg' : 'text-[11px]'
  const monsterName = monsterNameFor(node)
  // Plain fight circles carry no structural caption, so they show the monster's
  // name (feedback #8). The larger named nodes (waypoint/approach/boss) keep
  // their positional caption and surface the monster on hover instead, so the
  // graph doesn't get two lines of text under every big node.
  const caption = style.caption ?? (node.kind === 'fight' ? monsterName : undefined)

  return (
    <div className="absolute z-[1] -translate-x-1/2 -translate-y-1/2" style={{ left: x, top: y }}>
      <button
        type="button"
        disabled={!clickable}
        onClick={() => onSelect(node.id)}
        title={monsterName}
        aria-label={`${node.kind}${monsterName ? ` (${monsterName})` : ''} — ${node.state}`}
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
            className={`font-display font-bold ${glyphSize} ${
              isRevealedMimic(node) ? 'text-danger-bright' : classes.label
            } ${style.shape === 'diamond' ? '-rotate-45' : ''}`}
          >
            {glyph}
          </span>
        )}
      </button>
      {caption && (
        // Stack a multiword name one word per centred line, instead of one wide
        // row that clips the path (feedback #8). A hard break per word is
        // deterministic — a soft wrap depended on the name being wider than the
        // caption box, which short two-word names aren't. ROW_GAP was widened to
        // clear the resulting two-/three-line caption.
        <span className="absolute top-full left-1/2 mt-1 flex -translate-x-1/2 flex-col items-center font-mono text-[9px] leading-tight tracking-wide text-text-dim uppercase">
          {caption.split(' ').map((word, index) => (
            // whitespace-nowrap keeps a single word (hyphen and all) on one line
            // — otherwise "Kuo-toa Whip" breaks at the hyphen when its short
            // sibling ("Whip") lets the flex item shrink to min-content
            // (round-2 #B). The space break between words is unaffected.
            // eslint-disable-next-line react/no-array-index-key -- caption words are positional
            <span key={index} className="whitespace-nowrap">
              {word}
            </span>
          ))}
        </span>
      )}
    </div>
  )
}

export default DungeonNode
