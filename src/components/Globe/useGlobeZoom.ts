import { useEffect, useRef, useState, type RefObject } from 'react'
import type { GlobeHandle, ZoomLevel } from '../../types/globe'

const FAR_THRESHOLD = 1.9
const MEDIUM_THRESHOLD = 1.1
const ZOOM_DEBOUNCE_MS = 220
const POV_SAMPLE_MS = 160
const ALTITUDE_DELTA_THRESHOLD = 0.02
const POV_DELTA_THRESHOLD = 0.25

type GlobePov = {
  lat: number
  lng: number
}

function resolveZoomLevel(altitude: number): ZoomLevel {
  if (altitude > FAR_THRESHOLD) return 'far'
  if (altitude > MEDIUM_THRESHOLD) return 'medium'
  return 'close'
}

export function useGlobeZoom(globeRef: RefObject<GlobeHandle | null>) {
  const [altitude, setAltitude] = useState<number>(1.5)
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('medium')
  const [pov, setPov] = useState<GlobePov>({ lat: 0, lng: 0 })
  const altitudeRef = useRef(1.5)
  const povRef = useRef<GlobePov>({ lat: 0, lng: 0 })
  const zoomLevelRef = useRef<ZoomLevel>('medium')

  useEffect(() => {
    altitudeRef.current = altitude
  }, [altitude])

  useEffect(() => {
    povRef.current = pov
  }, [pov])

  useEffect(() => {
    zoomLevelRef.current = zoomLevel
  }, [zoomLevel])

  useEffect(() => {
    let frameId = 0
    let lastUpdatedAt = 0
    let pendingZoomLevel = zoomLevelRef.current
    let zoomDebounceTimer: ReturnType<typeof setTimeout> | null = null

    const commitZoomLevel = (nextZoom: ZoomLevel) => {
      if (pendingZoomLevel === nextZoom) return
      pendingZoomLevel = nextZoom

      if (zoomDebounceTimer) {
        clearTimeout(zoomDebounceTimer)
      }

      zoomDebounceTimer = setTimeout(() => {
        if (zoomLevelRef.current !== nextZoom) {
          setZoomLevel(nextZoom)
        }
      }, ZOOM_DEBOUNCE_MS)
    }

    const watchZoom = (timestamp: number) => {
      if (timestamp - lastUpdatedAt > POV_SAMPLE_MS && globeRef.current) {
        const currentPov = globeRef.current.pointOfView()
        const currentAltitude = currentPov.altitude ?? 2.5
        const nextZoom = resolveZoomLevel(currentAltitude)
        const lat = currentPov.lat ?? 0
        const lng = currentPov.lng ?? 0

        if (Math.abs(altitudeRef.current - currentAltitude) > ALTITUDE_DELTA_THRESHOLD) {
          altitudeRef.current = currentAltitude
          setAltitude(currentAltitude)
        }

        if (
          Math.abs(povRef.current.lat - lat) > POV_DELTA_THRESHOLD ||
          Math.abs(povRef.current.lng - lng) > POV_DELTA_THRESHOLD
        ) {
          const nextPov = { lat, lng }
          povRef.current = nextPov
          setPov(nextPov)
        }

        commitZoomLevel(nextZoom)
        lastUpdatedAt = timestamp
      }

      frameId = requestAnimationFrame(watchZoom)
    }

    frameId = requestAnimationFrame(watchZoom)

    return () => {
      cancelAnimationFrame(frameId)
      if (zoomDebounceTimer) {
        clearTimeout(zoomDebounceTimer)
      }
    }
  }, [globeRef])

  return { zoomLevel, altitude, pov }
}
