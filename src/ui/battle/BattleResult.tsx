import type { BattleStatus } from '../../domain/types'

interface BattleResultProps {
  status: BattleStatus
}

const BattleResult = ({ status }: BattleResultProps) => {
  if (status === 'ongoing') return null

  return (
    <div className="rounded border p-4 text-center text-xl font-bold">
      {status === 'won' ? 'You win!' : 'You lose...'}
    </div>
  )
}

export default BattleResult
