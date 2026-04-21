import { useEffect, useState } from 'react'

type NetworkInformation = {
  saveData?: boolean
}

function getInitialMode(): boolean {
  if (typeof window === 'undefined') return false

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  const narrowViewport = window.matchMedia('(max-width: 920px)').matches
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const lowMemory = typeof navigator !== 'undefined' && 'deviceMemory' in navigator
    ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory !== undefined &&
      (navigator as Navigator & { deviceMemory?: number }).deviceMemory! <= 4
    : false
  const lowCoreCount = typeof navigator !== 'undefined' && navigator.hardwareConcurrency > 0
    ? navigator.hardwareConcurrency <= 6
    : false
  const saveData = typeof navigator !== 'undefined' && 'connection' in navigator
    ? Boolean((navigator as Navigator & { connection?: NetworkInformation }).connection?.saveData)
    : false

  return coarsePointer || narrowViewport || prefersReducedMotion || lowMemory || lowCoreCount || saveData
}

export function useMobilePerformanceMode() {
  const [isMobilePerformanceMode, setIsMobilePerformanceMode] = useState<boolean>(() => getInitialMode())

  useEffect(() => {
    if (typeof window === 'undefined') return

    const coarsePointerQuery = window.matchMedia('(pointer: coarse)')
    const narrowViewportQuery = window.matchMedia('(max-width: 920px)')
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const sync = () => {
      setIsMobilePerformanceMode(getInitialMode())
    }

    coarsePointerQuery.addEventListener('change', sync)
    narrowViewportQuery.addEventListener('change', sync)
    reducedMotionQuery.addEventListener('change', sync)
    window.addEventListener('orientationchange', sync)

    return () => {
      coarsePointerQuery.removeEventListener('change', sync)
      narrowViewportQuery.removeEventListener('change', sync)
      reducedMotionQuery.removeEventListener('change', sync)
      window.removeEventListener('orientationchange', sync)
    }
  }, [])

  return isMobilePerformanceMode
}
