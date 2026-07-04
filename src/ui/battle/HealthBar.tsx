interface HealthBarProps {
  label: string
  hp: number
  maxHp: number
  family: 'gold' | 'danger'
}

// Player-side bars use the gold family, monster-side the danger (red)
// family — never mixed, per docs/design/visual-spec.html#palette.
const FAMILY_CLASSES = {
  gold: { border: 'border-accent-gold', fill: 'from-accent-gold to-accent-gold-bright' },
  danger: { border: 'border-danger', fill: 'from-danger to-danger-bright' },
} as const

const HealthBar = ({ label, hp, maxHp, family }: HealthBarProps) => {
  const pct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0
  const { border, fill } = FAMILY_CLASSES[family]

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-[15px] tracking-[0.06em] uppercase text-text-primary">
          {label}
        </span>
        <span className="font-mono text-xs text-text-dim">
          HP {Math.ceil(hp)} / {maxHp}
        </span>
      </div>
      <div className={`h-[14px] w-full rounded-[7px] border ${border} bg-black/40`}>
        <div
          className={`h-full rounded-[7px] bg-gradient-to-r ${fill}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default HealthBar
