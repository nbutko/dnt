import { useEffect, useRef } from 'react'

// rAF loop -> engine.tick(dt); stops requesting frames once `active` is false
// (battle won/lost), rather than the engine having any notion of a "loop".
export const useGameLoop = (tick: (dtMs: number) => void, active: boolean): void => {
  const lastTimeRef = useRef<number | null>(null)
  const tickRef = useRef(tick)
  tickRef.current = tick

  useEffect(() => {
    if (!active) {
      lastTimeRef.current = null
      return undefined
    }

    let frameId = 0
    const step = (time: number): void => {
      if (lastTimeRef.current !== null) {
        tickRef.current(time - lastTimeRef.current)
      }
      lastTimeRef.current = time
      frameId = requestAnimationFrame(step)
    }

    frameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameId)
  }, [active])
}
