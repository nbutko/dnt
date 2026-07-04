interface HealthBarProps {
  label: string
  hp: number
  maxHp: number
}

const HealthBar = ({ label, hp, maxHp }: HealthBarProps) => {
  const pct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span>
          {Math.ceil(hp)} / {maxHp}
        </span>
      </div>
      <div className="h-3 w-full rounded bg-gray-200">
        <div className="h-3 rounded bg-red-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default HealthBar
