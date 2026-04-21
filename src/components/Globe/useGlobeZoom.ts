import { startTransition, useEffect, useRef, useState, type RefObject } from 'react'
import type { GlobeHandle, ZoomLevel } from '../../types/globe'

const FAR_THRESHOLD = 1.9
const MEDIUM_THRESHOLD = 1.1
const DESKTOP_ZOOM_DEBOUNCE_MS = 220
const MOBILE_ZOOM_DEBOUNCE_MS = 360
const DESKTOP_POV_SAMPLE_MS = 160
const MOBILE_POV_SAMPLE_MS = 340
const DESKTOP_ALTITUDE_DELTA_THRESHOLD = 0.02
const MOBILE_ALTITUDE_DELTA_THRESHOLD = 0.04
const DESKTOP_POV_DELTA_THRESHOLD = 0.25
const MOBILE_POV_DELTA_THRESHOLD = 0.6

type GlobePov = {
  lat: number
  lng: number
}

function resolveZoomLevel(altitude: number): ZoomLevel {
  if (altitude > FAR_THRESHOLD) return 'far'
  if (altitude > MEDIUM_THRESHOLD) return 'medium'
  return 'close'
}

export function useGlobeZoom(
  globeRef: RefObject<GlobeHandle | null>,
  isMobilePerformanceMode = false,
  isPaused = false,
) {
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
    if (isPaused) {
      const globe = globeRef.current
      if (globe) {
        const controls = globe.controls()
        controls.enabled = false
      }

      return
    }

    let cancelled = false
    let rafId = 0
    let teardown: (() => void) | null = null

    const attachWhenReady = () => {
      if (cancelled) return

      const globe = globeRef.current
      if (!globe) {
        rafId = requestAnimationFrame(attachWhenReady)
        return
      }

      const controls = globe.controls()
      controls.enabled = true
      let pendingZoomLevel = zoomLevelRef.current
      let zoomDebounceTimer: ReturnType<typeof setTimeout> | null = null
      let cameraDebounceTimer: ReturnType<typeof setTimeout> | null = null

      const cameraDebounceMs = isMobilePerformanceMode ? 80 : 36

      const commitZoomLevel = (nextZoom: ZoomLevel) => {
        if (pendingZoomLevel === nextZoom) return
        pendingZoomLevel = nextZoom

        if (zoomDebounceTimer) {
          clearTimeout(zoomDebounceTimer)
        }

        zoomDebounceTimer = setTimeout(() => {
          if (zoomLevelRef.current !== nextZoom) {
            startTransition(() => {
              setZoomLevel(nextZoom)
            })
          }
        }, isMobilePerformanceMode ? MOBILE_ZOOM_DEBOUNCE_MS : DESKTOP_ZOOM_DEBOUNCE_MS)
      }

      const syncFromCamera = () => {
        if (!globeRef.current) return

        const sampleMs = isMobilePerformanceMode ? MOBILE_POV_SAMPLE_MS : DESKTOP_POV_SAMPLE_MS
        const altitudeThreshold = isMobilePerformanceMode
          ? MOBILE_ALTITUDE_DELTA_THRESHOLD
          : DESKTOP_ALTITUDE_DELTA_THRESHOLD
        const povThreshold = isMobilePerformanceMode
          ? MOBILE_POV_DELTA_THRESHOLD
          : DESKTOP_POV_DELTA_THRESHOLD

        if (cameraDebounceTimer) {
          clearTimeout(cameraDebounceTimer)
        }

        cameraDebounceTimer = setTimeout(() => {
          if (!globeRef.current) return

          const currentPov = globeRef.current.pointOfView()
          const currentAltitude = currentPov.altitude ?? 2.5
          const nextZoom = resolveZoomLevel(currentAltitude)
          const lat = currentPov.lat ?? 0
          const lng = currentPov.lng ?? 0

          if (Math.abs(altitudeRef.current - currentAltitude) > altitudeThreshold) {
            altitudeRef.current = currentAltitude
            startTransition(() => {
              setAltitude(currentAltitude)
            })
          }

          if (
            Math.abs(povRef.current.lat - lat) > povThreshold ||
            Math.abs(povRef.current.lng - lng) > povThreshold
          ) {
            const nextPov = { lat, lng }
            povRef.current = nextPov
            startTransition(() => {
              setPov(nextPov)
            })
          }

          commitZoomLevel(nextZoom)
        }, Math.max(cameraDebounceMs, sampleMs * 0.25))
      }

      controls.addEventListener('change', syncFromCamera)
      syncFromCamera()

      teardown = () => {
        controls.removeEventListener('change', syncFromCamera)
        if (zoomDebounceTimer) {
          clearTimeout(zoomDebounceTimer)
        }
        if (cameraDebounceTimer) {
          clearTimeout(cameraDebounceTimer)
        }
      }
    }

    attachWhenReady()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      teardown?.()

      const globe = globeRef.current
      if (globe && isPaused) {
        globe.controls().enabled = false
      }
    }
  }, [globeRef, isMobilePerformanceMode, isPaused])

  return { zoomLevel, altitude, pov }
}
