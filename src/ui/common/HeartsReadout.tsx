interface HeartsReadoutProps {
  current: number
  max: number
}

// ♥/♡ row (design/README.md §3 — dungeon header). Filled hearts use the
// danger-bright red; empty ones dim to opacity .35 per the spec.
const HeartsReadout = ({ current, max }: HeartsReadoutProps) => (
  <div
    className="flex gap-1 font-display text-xl tracking-[0.05em] text-danger-bright"
    aria-label={`${current} of ${max} hearts remaining`}
  >
    {Array.from({ length: max }, (_, index) => (
      // eslint-disable-next-line react/no-array-index-key -- hearts have no other identity
      <span key={index} className={index < current ? undefined : 'opacity-[0.35]'}>
        {index < current ? '♥' : '♡'}
      </span>
    ))}
  </div>
)

export default HeartsReadout
