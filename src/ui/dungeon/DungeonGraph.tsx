import { useMemo } from 'react'
import type { DungeonGraph as DungeonGraphData } from '../../domain/dungeon'
import { layoutDungeon } from './graph-layout'
import DungeonNode from './DungeonNode'

interface DungeonGraphProps {
  graph: DungeonGraphData
  onSelectNode: (id: string) => void
}

// Edge colours (design/README.md §3): an edge is solid gold only when its
// SOURCE node is cleared — a road you actually walked — and dim dashed
// otherwise (feedback #4). Keying off the source (not the target) stops a
// cleared chokepoint like the Waypoint from lighting up every incoming edge,
// including ones from still-locked paths you never took. The entrance is
// auto-cleared, so the first-move edges glow from the start. SVG stroke
// attributes can't read the Tailwind @theme vars, so the two literals live
// here — they mirror --color-accent-gold-bright / --color-node-locked-border in
// index.css.
const EDGE_WALKABLE = '#e8c766'
const EDGE_LOCKED = '#5a4a30'

// The branch graph (image 3b): an absolutely-positioned <svg> edge layer (z0)
// under the positioned node <div>s (z1). Layout is a pure function of the
// graph, so this component just draws the points it's handed.
const DungeonGraph = ({ graph, onSelectNode }: DungeonGraphProps) => {
  const { positions, width, height } = useMemo(() => layoutDungeon(graph), [graph])

  const edges = useMemo(
    () =>
      Object.values(graph.nodes).flatMap((node) => {
        const from = positions.get(node.id)
        if (!from) return []
        return node.edges.flatMap((targetId) => {
          const to = positions.get(targetId)
          if (!to) return []
          const walked = node.state === 'cleared'
          return [{ key: `${node.id}->${targetId}`, from, to, walkable: walked }]
        })
      }),
    [graph, positions],
  )

  return (
    <div className="scroll-x-subtle overflow-x-auto py-2">
      <div className="relative mx-auto" style={{ width, height }}>
        <svg className="absolute top-0 left-0 z-0" width={width} height={height} aria-hidden>
          {edges.map((edge) => (
            <line
              key={edge.key}
              x1={edge.from.x}
              y1={edge.from.y}
              x2={edge.to.x}
              y2={edge.to.y}
              stroke={edge.walkable ? EDGE_WALKABLE : EDGE_LOCKED}
              strokeWidth={2}
              strokeDasharray={edge.walkable ? undefined : '5,5'}
            />
          ))}
        </svg>
        {Object.values(graph.nodes).map((node) => {
          const point = positions.get(node.id)
          if (!point) return null
          return (
            <DungeonNode key={node.id} node={node} x={point.x} y={point.y} onSelect={onSelectNode} />
          )
        })}
      </div>
    </div>
  )
}

export default DungeonGraph
