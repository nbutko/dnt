import type { BattleStatus } from '../../domain/types'

interface BattleResultProps {
  status: BattleStatus
}

const BattleResult = ({ status }: BattleResultProps) => {
  if (status === 'ongoing') return null

  return (
    <div
      className={`rounded border p-4 text-center font-display text-xl tracking-[0.08em] uppercase ${
        status === 'won' ? 'border-accent-gold text-accent-gold-bright' : 'border-danger text-danger-bright'
      }`}
    >
      {status === 'won' ? 'You win!' : 'You lose...'}
    </div>
  )
}

export default BattleResult
