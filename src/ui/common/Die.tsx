// The projected 3D d20 (docs/design/m3-wireframes.html turn 4's encounter-d20
// mock) — THE one die component, shared by AbilityRoller's tumbling ability
// rolls (Story 4) and the encounter-roll modal (Story 6). Pure presentation:
// every face/edge/outline coordinate below is traced verbatim from the
// wireframe's icosahedron projection, so every consumer renders the exact
// same silhouette and only the palette (state) or the shown number changes.

export type DieVariant = 'gold' | 'inspired' | 'fumble' | 'muted'

interface DiePalette {
  faces: readonly string[]
  outline: string
  text: string
}

// Colors lifted 1:1 from the wireframe: gold is a normal landed roll, inspired
// is the nat-20 "INSPIRED!" face (green), fumble is the nat-1 face (red), and
// muted is the dimmed "dropped" die (also doubles as the in-flight look while
// `rolling` is true, since no face is meaningfully "landed" yet).
const PALETTES: Record<DieVariant, DiePalette> = {
  gold: {
    faces: [
      '#9b7d1e', '#3c310c', '#3c310c', '#6a5515', '#3c310c',
      '#a98821', '#c8a127', '#786017', '#aa8921', '#786117',
    ],
    outline: '#e8c766',
    text: '#fff4d0',
  },
  inspired: {
    faces: [
      '#368349', '#15331c', '#15331c', '#255a32', '#15331c',
      '#3b8f50', '#46a95f', '#2a6538', '#3b9050', '#2a6639',
    ],
    outline: '#9cf07c',
    text: '#eaffe0',
  },
  fumble: {
    faces: [
      '#872a2a', '#341010', '#341010', '#5c1d1d', '#341010',
      '#932e2e', '#ae3737', '#682121', '#942f2f', '#692121',
    ],
    outline: '#ff9a9a',
    text: '#ffe6e6',
  },
  muted: {
    faces: [
      '#5c533e', '#242018', '#242018', '#3f392a', '#242018',
      '#655b43', '#786c50', '#474030', '#665b44', '#484130',
    ],
    outline: '#8a7a5a',
    text: '#c9b892',
  },
}

// The 10 visible face polygons of the icosahedron projection — fixed geometry,
// identical across every variant/value; only the fill (from the palette
// above) ever changes.
const FACES: readonly string[] = [
  '61.09,8.28 12.19,18.99 48.93,7.59',
  '51.07,92.41 38.91,91.72 6.00,70.98',
  '94.00,29.02 85.11,53.66 87.81,81.01',
  '94.00,29.02 61.09,8.28 85.11,53.66',
  '51.07,92.41 85.11,53.66 87.81,81.01',
  '34.55,47.46 12.19,18.99 6.00,70.98',
  '34.55,47.46 61.09,8.28 12.19,18.99',
  '34.55,47.46 51.07,92.41 6.00,70.98',
  '34.55,47.46 61.09,8.28 85.11,53.66',
  '34.55,47.46 51.07,92.41 85.11,53.66',
]

// The internal edge lines (faint highlight over the face fills).
const EDGES: ReadonlyArray<readonly [number, number, number, number]> = [
  [51.07, 92.41, 85.11, 53.66],
  [34.55, 47.46, 61.09, 8.28],
  [61.09, 8.28, 48.93, 7.59],
  [12.19, 18.99, 48.93, 7.59],
  [51.07, 92.41, 6.0, 70.98],
  [38.91, 91.72, 6.0, 70.98],
  [85.11, 53.66, 87.81, 81.01],
  [61.09, 8.28, 85.11, 53.66],
  [94.0, 29.02, 61.09, 8.28],
  [34.55, 47.46, 85.11, 53.66],
  [94.0, 29.02, 87.81, 81.01],
  [51.07, 92.41, 38.91, 91.72],
  [51.07, 92.41, 87.81, 81.01],
  [34.55, 47.46, 51.07, 92.41],
  [34.55, 47.46, 6.0, 70.98],
  [94.0, 29.02, 85.11, 53.66],
  [34.55, 47.46, 12.19, 18.99],
  [61.09, 8.28, 12.19, 18.99],
  [12.19, 18.99, 6.0, 70.98],
]

const OUTLINE = '6.00,70.98 12.19,18.99 48.93,7.59 61.09,8.28 94.00,29.02 87.81,81.01 51.07,92.41 38.91,91.72'

interface DieProps {
  // The landed value. Ignored (no number drawn) while `rolling` is true.
  value: number
  variant?: DieVariant
  // True while the die is mid-roll: hides the number and forces the muted
  // palette, then the caller's CSS drives the tumble via the `die-tumble`
  // keyframes (index.css) applied through `className`.
  rolling?: boolean
  size?: number
  className?: string
}

const Die = ({ value, variant = 'gold', rolling = false, size = 96, className = '' }: DieProps) => {
  const palette = PALETTES[rolling ? 'muted' : variant]
  const label = String(value)
  // Single-digit faces (the nat-1 mock) use a bigger, lower-baselined glyph
  // than two-digit ones — exact metrics traced from the wireframe's own "1"
  // vs. "15"/"20" text elements.
  const isSingleDigit = label.length <= 1
  const textY = isSingleDigit ? 78.11 : 74.71
  const fontSize = isSingleDigit ? 40 : 30

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`${rolling ? 'die-tumble' : ''} ${className}`.trim()}
      role="img"
      aria-label={rolling ? 'rolling' : `die showing ${value}`}
    >
      {FACES.map((points, index) => (
        <polygon
          key={points}
          points={points}
          fill={palette.faces[index]}
          stroke={palette.faces[index]}
          strokeWidth={0.4}
        />
      ))}
      {EDGES.map(([x1, y1, x2, y2]) => (
        <line
          key={`${x1},${y1}-${x2},${y2}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={palette.outline}
          strokeOpacity={0.35}
          strokeWidth={0.5}
        />
      ))}
      <polygon points={OUTLINE} fill="none" stroke={palette.outline} strokeWidth={2.2} strokeLinejoin="round" />
      {!rolling && (
        <>
          <text
            x={56.91}
            y={textY}
            textAnchor="middle"
            fontFamily="Cinzel,serif"
            fontWeight={700}
            fontSize={fontSize}
            fill="#000"
            fillOpacity={0.45}
          >
            {label}
          </text>
          <text
            x={56.91}
            y={textY}
            textAnchor="middle"
            fontFamily="Cinzel,serif"
            fontWeight={700}
            fontSize={fontSize}
            fill={palette.text}
          >
            {label}
          </text>
        </>
      )}
    </svg>
  )
}

export default Die
