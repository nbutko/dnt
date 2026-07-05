interface LegendProps {
  // Node shape matches the swatch to its context: square tier cards (world
  // map) vs. round graph nodes (dungeon) — see design/README.md §2/§3.
  shape?: 'square' | 'circle'
  showChest?: boolean
}

// The 3-state legend row — reused verbatim by the world map and the dungeon
// graph (docs/design/README.md). Swatch fills mirror ui/common/nodeState.ts.
const Legend = ({ shape = 'square', showChest = false }: LegendProps) => {
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-[3px]'
  const clearedFill =
    shape === 'circle'
      ? 'bg-[radial-gradient(circle_at_35%_30%,#e8c766,#8a6a1a)]'
      : 'bg-gradient-to-br from-node-cleared-from to-node-cleared-to'

  return (
    <div className="mt-4 flex flex-wrap justify-center gap-4 font-mono text-[10px] text-text-dim">
      <span className="flex items-center gap-1.5">
        <span className={`h-3 w-3 border border-accent-gold ${shapeClass} ${clearedFill}`} />
        Cleared
      </span>
      <span className="flex items-center gap-1.5">
        <span className={`h-3 w-3 border border-accent-gold-bright bg-panel-base ${shapeClass}`} />
        Available
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className={`h-3 w-3 border border-dashed border-node-locked-border bg-node-locked ${shapeClass}`}
        />
        Locked
      </span>
      {showChest && (
        <span className="flex items-center gap-1.5">
          <span className="h-[11px] w-[11px] rotate-45 border border-accent-gold bg-panel-monster-from" />
          Chest (mimic-indistinguishable)
        </span>
      )}
    </div>
  )
}

export default Legend
