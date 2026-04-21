import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import Globe from 'react-globe.gl'
import { geoCentroid } from 'd3'
import { feature as topojsonFeature } from 'topojson-client'
import { Link } from 'react-router-dom'
import type { FeatureCollection, Geometry } from 'geojson'
import { useGlobeZoom } from './useGlobeZoom'
import { useGlobePlants } from './useGlobePlants'
import { useMobilePerformanceMode } from './useMobilePerformanceMode'
import { PlantSidebar } from './PlantSidebar'
import { useAuth } from '../../features/auth'
import { fetchPlantSidebarData, type PlantSidebarData } from '../../services/planting'
import type { ClusteredPlantedPlant } from './plants'
import type {
  AreaFeature,
  City,
  GlobeHandle,
} from '../../types/globe'

const COUNTRIES_TOPO_URL =
  'https://unpkg.com/world-atlas@2/countries-110m.json'
const STATES_GEOJSON_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces.geojson'
const STATES_GEOJSON_FALLBACK_URL =
  'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_50m_admin_1_states_provinces.geojson'

const COUNTRY_FILL_COLOR = 'rgb(69, 177, 108)'
const STATE_FILL_COLOR = 'rgb(69, 177, 108)'
const COUNTRY_STROKE_COLOR = 'rgba(30, 78, 48, 0.26)'
const STATE_STROKE_COLOR = COUNTRY_STROKE_COLOR;
const CLOSE_ALTITUDE = 0.70
const COUNTRY_POLYGON_TRANSITION_MS = 220
const DENSE_POLYGON_TRANSITION_MS = 0
const MEDIUM_STATE_LIMIT = 80
const CLOSE_STATE_LIMIT = 140
const MEDIUM_STATE_DISTANCE = 16
const CLOSE_STATE_DISTANCE = 20
const MOBILE_MEDIUM_STATE_LIMIT = 28
const MOBILE_CLOSE_STATE_LIMIT = 44
const MOBILE_MEDIUM_STATE_DISTANCE = 12
const MOBILE_CLOSE_STATE_DISTANCE = 14
const SOLID_GLOBE_IMAGE_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2048 1024"><rect width="2048" height="1024" fill="#4FA3E3"/></svg>',
)}`

function getAreaId(area: AreaFeature | null): string {
  if (!area) return ''
  const propertyId = area.properties?.id
  const propertyName = area.properties?.name
  const areaId = (area.id ?? '').toString()

  return propertyId || propertyName || areaId
}

function normalizeLng(lng: number): number {
  if (lng > 180) return lng - 360
  if (lng < -180) return lng + 360
  return lng
}

function angularDistance(aLat: number, aLng: number, bLat: number, bLng: number) {
  const latDistance = aLat - bLat
  const lngDelta = Math.abs(normalizeLng(aLng) - normalizeLng(bLng))
  const lngDistance = Math.min(lngDelta, 360 - lngDelta) * Math.cos((aLat * Math.PI) / 180)

  return Math.sqrt(latDistance * latDistance + lngDistance * lngDistance)
}

const DEFAULT_AVATAR_DATA_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#74d8b1"/><stop offset="1" stop-color="#2f8f6f"/></linearGradient></defs><rect width="64" height="64" rx="18" fill="url(#g)"/><circle cx="32" cy="24" r="10" fill="#e9fff4"/><path d="M14 54c2-9 10-15 18-15s16 6 18 15" fill="#e9fff4"/></svg>',
)}`

const CITY_FALLBACK_DATA: City[] = [
  { id: 'delhi', name: 'Delhi', country: 'India', state: 'Delhi', lat: 28.6139, lng: 77.209, population: 32900000 },
  { id: 'mumbai', name: 'Mumbai', country: 'India', state: 'Maharashtra', lat: 19.076, lng: 72.8777, population: 21600000 },
  { id: 'bengaluru', name: 'Bengaluru', country: 'India', state: 'Karnataka', lat: 12.9716, lng: 77.5946, population: 13600000 },
  { id: 'dehradun', name: 'Dehradun', country: 'India', state: 'Uttarakhand', lat: 30.3165, lng: 78.0322, population: 1100000 },
  { id: 'london', name: 'London', country: 'United Kingdom', state: 'England', lat: 51.5072, lng: -0.1276, population: 9648000 },
  { id: 'new-york', name: 'New York', country: 'United States', state: 'New York', lat: 40.7128, lng: -74.006, population: 18800000 },
  { id: 'sao-paulo', name: 'Sao Paulo', country: 'Brazil', state: 'Sao Paulo', lat: -23.5558, lng: -46.6396, population: 22400000 },
  { id: 'lagos', name: 'Lagos', country: 'Nigeria', state: 'Lagos', lat: 6.5244, lng: 3.3792, population: 15300000 },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', state: 'Tokyo', lat: 35.6762, lng: 139.6503, population: 37200000 },
  { id: 'sydney', name: 'Sydney', country: 'Australia', state: 'New South Wales', lat: -33.8688, lng: 151.2093, population: 5360000 },
]

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function GlobeView() {
  const containerRef = useRef<HTMLElement | null>(null)
  const globeRef = useRef<GlobeHandle | null>(null)
  const hasInitializedViewRef = useRef(false)
  const statesLoadingRef = useRef(false)
  const hasZoomedToUserRef = useRef(false)
  const [globeSize, setGlobeSize] = useState({ width: 0, height: 0 })
  const [countries, setCountries] = useState<AreaFeature[]>([])
  const [states, setStates] = useState<AreaFeature[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [hoveredAreaId, setHoveredAreaId] = useState<string | null>(null)
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null)
  const [overlayLoadingStatus, setOverlayLoadingStatus] = useState('Loading countries...')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarLoading, setIsSidebarLoading] = useState(false)
  const [sidebarError, setSidebarError] = useState('')
  const [sidebarData, setSidebarData] = useState<PlantSidebarData | null>(null)
  const sidebarRequestIdRef = useRef(0)
  const isMobilePerformanceMode = useMobilePerformanceMode()
  const { zoomLevel, pov } = useGlobeZoom(globeRef, isMobilePerformanceMode)
  const { user } = useAuth()
  const {
    visiblePlants,
    objectThreeObject,
    isPlantModelReady,
    loadingStatus: plantLoadingStatus,
  } = useGlobePlants({ pov, zoomLevel, isMobilePerformanceMode })
  const deferredZoomLevel = useDeferredValue(zoomLevel)
  const userAvatarUrl = ((user?.user_metadata?.avatar_url as string | undefined)
    || (user?.user_metadata?.picture as string | undefined)
    || '')
    .trim()
  const userName = ((user?.user_metadata?.full_name as string | undefined)
    || (user?.user_metadata?.name as string | undefined)
    || (user?.user_metadata?.preferred_username as string | undefined)
    || user?.email?.split('@')[0]
    || 'Plantera User')
    .trim()

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let frameId = 0

    const updateSize = () => {
      const { width, height } = container.getBoundingClientRect()
      const nextWidth = Math.max(1, Math.floor(width))
      const nextHeight = Math.max(1, Math.floor(height))

      setGlobeSize((prev) => {
        if (prev.width === nextWidth && prev.height === nextHeight) return prev
        return { width: nextWidth, height: nextHeight }
      })
    }

    updateSize()

    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(updateSize)
    })

    observer.observe(container)
    window.addEventListener('orientationchange', updateSize)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(frameId)
      window.removeEventListener('orientationchange', updateSize)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadCountries = async () => {
      try {
        const response = await fetch(COUNTRIES_TOPO_URL)
        const topoData = await response.json()
        const countryCollection = topojsonFeature(
          topoData,
          topoData.objects.countries,
        ) as unknown as FeatureCollection<Geometry>
        const countryFeatures = countryCollection.features as AreaFeature[]

        if (!cancelled) {
          startTransition(() => {
            setCountries(countryFeatures)
            setOverlayLoadingStatus('')
          })
        }
      } catch (error) {
        if (!cancelled) {
          setOverlayLoadingStatus('Could not load country boundaries')
          console.error(error)
        }
      }
    }

    loadCountries()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!globeRef.current || hasInitializedViewRef.current) return
    hasInitializedViewRef.current = true

    const defaultPov = { lat: 15, lng: 10, altitude: 1.5 }
    globeRef.current.pointOfView(defaultPov, 0)

    const controls = globeRef.current.controls()
    controls.enableDamping = true
    controls.dampingFactor = 0.1
    controls.rotateSpeed = 0.7
    controls.zoomSpeed = 0.8
    controls.autoRotate = false
    controls.autoRotateSpeed = 0.45
    controls.minDistance = 110
    controls.maxDistance = 700
  }, [globeSize.height, globeSize.width])

  useEffect(() => {
    if (!globeRef.current || !countries.length || hasZoomedToUserRef.current) return
    hasZoomedToUserRef.current = true

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!globeRef.current) return

          globeRef.current.pointOfView(
            {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              altitude: CLOSE_ALTITUDE,
            },
            1600,
          )
        },
        () => {
          if (!globeRef.current) return
          const defaultPov = { lat: 15, lng: 10, altitude: 1.5 }
          globeRef.current.pointOfView(defaultPov, 500)
        },
        {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 300000,
        },
      )
    }
  }, [countries.length])

  useEffect(() => {
    if (zoomLevel === 'far') return
    if (states.length || statesLoadingRef.current) return

    let cancelled = false
    statesLoadingRef.current = true

    const loadStates = async () => {
      setOverlayLoadingStatus('Loading states...')

      try {
        const response = await fetch(STATES_GEOJSON_URL)
        if (!response.ok) {
          throw new Error(`Primary state boundary request failed with status ${response.status}`)
        }

        const stateCollection = (await response.json()) as FeatureCollection<Geometry>
        if (!Array.isArray(stateCollection.features) || stateCollection.features.length === 0) {
          throw new Error('Primary remote state boundary payload did not include features')
        }

        startTransition(() => {
          setStates(stateCollection.features as AreaFeature[])
          setOverlayLoadingStatus('')
        })

      } catch (error) {
        try {
          const response = await fetch(STATES_GEOJSON_FALLBACK_URL)
          if (!response.ok) {
            throw new Error(`Fallback state boundary request failed with status ${response.status}`)
          }

          const stateCollection = (await response.json()) as FeatureCollection<Geometry>
          if (!Array.isArray(stateCollection.features) || stateCollection.features.length === 0) {
            throw new Error('Fallback remote state boundary payload did not include features')
          }

          if (cancelled) return

          startTransition(() => {
            setStates(stateCollection.features as AreaFeature[])
            setOverlayLoadingStatus('')
          })
        } catch (fallbackError) {
          if (!cancelled) {
            setOverlayLoadingStatus('Could not load state boundaries')
          }
          console.error(fallbackError)
        }

        console.error(error)
      } finally {
        statesLoadingRef.current = false
      }
    }

     loadStates()

    return () => {
      cancelled = true
    }
  }, [states.length, zoomLevel])

  useEffect(() => {
    if (isMobilePerformanceMode || zoomLevel !== 'close' || cities.length) return

    let cancelled = false

    const loadCities = () => {
      if (!cancelled) {
        startTransition(() => {
          setCities(CITY_FALLBACK_DATA)
        })
      }
    }

    loadCities()

    return () => {
      cancelled = true
    }
  }, [zoomLevel, cities.length, isMobilePerformanceMode])

  const stateCentroids = useMemo(() => {
    return states.map((feature) => {
      const [lng, lat] = geoCentroid(feature)
      return {
        feature,
        lat,
        lng,
      }
    })
  }, [states])

  const visibleStates = useMemo<AreaFeature[]>(() => {
    if (!states.length) return []

    const maxDistance = deferredZoomLevel === 'close'
      ? (isMobilePerformanceMode ? MOBILE_CLOSE_STATE_DISTANCE : CLOSE_STATE_DISTANCE)
      : (isMobilePerformanceMode ? MOBILE_MEDIUM_STATE_DISTANCE : MEDIUM_STATE_DISTANCE)
    const maxStates = deferredZoomLevel === 'close'
      ? (isMobilePerformanceMode ? MOBILE_CLOSE_STATE_LIMIT : CLOSE_STATE_LIMIT)
      : (isMobilePerformanceMode ? MOBILE_MEDIUM_STATE_LIMIT : MEDIUM_STATE_LIMIT)
    const distances = stateCentroids
      .map((entry) => ({
        feature: entry.feature,
        distance: angularDistance(entry.lat, entry.lng, pov.lat, pov.lng),
      }))
      .sort((a, b) => a.distance - b.distance)

    const candidates = distances
      .filter((entry) => entry.distance <= maxDistance)
      .slice(0, maxStates)
      .map((entry) => entry.feature)

    if (candidates.length > 0) {
      return candidates
    }

    return distances.slice(0, Math.min(300, maxStates)).map((entry) => entry.feature)
  }, [deferredZoomLevel, isMobilePerformanceMode, pov.lat, pov.lng, stateCentroids, states.length])

  const activePolygons = useMemo<AreaFeature[]>(() => {
    if (deferredZoomLevel === 'far') return countries
    if (states.length === 0) return countries

    return [...countries, ...visibleStates]
  }, [countries, deferredZoomLevel, states.length, visibleStates])

  const statesLayerActive = deferredZoomLevel !== 'far' && states.length > 0

  const countryIdSet = useMemo(() => {
    return new Set(countries.map((country) => getAreaId(country)))
  }, [countries])

  const isCountryArea = useCallback((area: AreaFeature) => countryIdSet.has(getAreaId(area)), [countryIdSet])

  const areaNameByLevel = useMemo(() => {
    if (deferredZoomLevel === 'far') {
      return (area: AreaFeature) => area?.properties?.name || 'Country'
    }

    return (area: AreaFeature) => area?.properties?.name || 'State'
  }, [deferredZoomLevel])

  const polygonCapColor = useCallback((area: AreaFeature) => {
    const id = getAreaId(area)
    // if (selectedAreaId === id) return 'rgba(251, 191, 36, 0.62)'
    if (hoveredAreaId === id) return 'rgb(59, 151, 93)'
    if (isCountryArea(area)) return COUNTRY_FILL_COLOR
    return STATE_FILL_COLOR
  }, [hoveredAreaId, isCountryArea, selectedAreaId])

  const polygonSideColor = useCallback((area: AreaFeature) => {
    return isCountryArea(area) ? 'rgba(79, 163, 227, 0.1)' : 'rgba(3, 7, 18, 0.01)'
  }, [isCountryArea])

  const polygonStrokeColor = useCallback((area: AreaFeature) => {
    return isCountryArea(area) ? COUNTRY_STROKE_COLOR : STATE_STROKE_COLOR
  }, [isCountryArea])

  const polygonAltitude = useCallback((area: AreaFeature) => {
    return isCountryArea(area) ? 0.006 : 0.008
  }, [isCountryArea])

  const polygonLabel = useCallback((area: AreaFeature) => {
    const name = areaNameByLevel(area)
    return `<div style="padding: 6px 8px; border-radius: 8px; background: rgba(2, 6, 23, 0.9); color: #e2e8f0; font-size: 12px;">${name}</div>`
  }, [areaNameByLevel])

  const handlePolygonHover = useCallback((area: AreaFeature | null) => {
    if (!area) {
      setHoveredAreaId(null)
      return
    }

    if (statesLayerActive && isCountryArea(area)) {
      setHoveredAreaId(null)
      return
    }

    const nextId = getAreaId(area)
    setHoveredAreaId((prevId) => (prevId === nextId ? prevId : nextId))
  }, [isCountryArea, statesLayerActive])

  const handlePolygonClick = useCallback((area: AreaFeature) => {
    if (!globeRef.current || !area) return

    const [lng, lat] = geoCentroid(area)
    const nextAltitude = zoomLevel === 'far' ? 1.35 : 0.78


    setSelectedAreaId(getAreaId(area))

    globeRef.current.pointOfView({ lat, lng, altitude: nextAltitude }, 1200)
  }, [zoomLevel])

  const pointColor = useCallback(() => '#f97316', [])

  const pointLabel = useCallback((city: City) => {
    const population = city.population.toLocaleString('en-US')
    return `<div style="padding: 8px 10px; border-radius: 8px; background: rgba(15, 23, 42, 0.95); color: #e2e8f0; font-size: 12px;"><div style="font-weight: 600;">${city.name}</div><div>${city.state}, ${city.country}</div><div>Population: ${population}</div></div>`
  }, [])

  const plantObjectLabel = useCallback((plant: ClusteredPlantedPlant) => {
    const safeName = escapeHtml(plant.name || 'Planted plant')
    const safeQuote = escapeHtml((plant.quote || 'A new plant joined the planet.').trim())
    const safeUser = escapeHtml(plant.userId || 'unknown')
    const avatarUrl = (plant.userAvatarUrl || '').trim() || DEFAULT_AVATAR_DATA_URI
    const safeAvatarUrl = escapeHtml(avatarUrl)
    const safeFallbackAvatar = escapeHtml(DEFAULT_AVATAR_DATA_URI)

    return `<div style="position: relative; max-width: 286px;"><div style="position: absolute; left: 16px; bottom: -11px; width: 18px; height: 18px; border-radius: 999px; background: #f8fff7; border: 1px solid rgba(34, 90, 65, 0.22);"></div><div style="position: absolute; left: 8px; bottom: -20px; width: 10px; height: 10px; border-radius: 999px; background: #f8fff7; border: 1px solid rgba(34, 90, 65, 0.22);"></div><div style="display: grid; grid-template-columns: 42px 1fr; gap: 10px; align-items: start; padding: 11px 12px; border-radius: 26px; background: linear-gradient(160deg, rgba(248, 255, 247, 0.98), rgba(227, 246, 232, 0.98)); border: 1px solid rgba(34, 90, 65, 0.22); box-shadow: 0 10px 24px rgba(17, 47, 33, 0.22); color: #163b2b;"><img src="${safeAvatarUrl}" alt="${safeUser}" onerror="this.onerror=null;this.src='${safeFallbackAvatar}'" style="width: 42px; height: 42px; border-radius: 14px; object-fit: cover; border: 1px solid rgba(34, 90, 65, 0.25);"/><div style="min-width: 0;"><div style="font-size: 12px; line-height: 1.25; font-weight: 800; color: #214f3a; margin-bottom: 4px;">${safeName}</div><div style="font-size: 12px; line-height: 1.35; color: #2c5f46; margin-bottom: 4px;">&quot;${safeQuote}&quot;</div><div style="font-size: 10px; line-height: 1.25; color: #4d7a64;">${plant.plantedCount} plant${plant.plantedCount > 1 ? 's' : ''} at this spot</div></div></div></div>`
  }, [])

  const handlePlantClick = useCallback((plant: ClusteredPlantedPlant) => {
    setIsSidebarOpen(true)
    setIsSidebarLoading(true)
    setSidebarError('')

    const requestId = sidebarRequestIdRef.current + 1
    sidebarRequestIdRef.current = requestId

    void fetchPlantSidebarData(plant.id, plant.userId)
      .then((data) => {
        if (sidebarRequestIdRef.current !== requestId) return

        if (!data) {
          setSidebarData({
            user: {
              id: plant.userId,
              name: plant.userId,
              avatarUrl: plant.userAvatarUrl ?? null,
            },
            plant: {
              ...plant,
              imageUrls: [],
            },
            regionalUsers: [],
          })
        } else {
          setSidebarData(data)
        }

        setIsSidebarLoading(false)
      })
      .catch((error) => {
        if (sidebarRequestIdRef.current !== requestId) return

        console.error('Could not load selected plant sidebar data', error)
        setSidebarError('Could not load selected plant details.')
        setIsSidebarLoading(false)
      })
  }, [])

  const handleSidebarClose = useCallback(() => {
    setIsSidebarOpen(false)
  }, [])

  const polygonTransitionDuration =
    isMobilePerformanceMode
      ? DENSE_POLYGON_TRANSITION_MS
      : deferredZoomLevel === 'far'
        ? COUNTRY_POLYGON_TRANSITION_MS
        : DENSE_POLYGON_TRANSITION_MS

  const isGlobeReady = countries.length > 0 && isPlantModelReady

  return (
    <section ref={containerRef} className="relative h-full min-h-[320px] w-full overflow-hidden" style={{ background: '#06080d' }}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(1400px 900px at 55% 48%, #131924 0%, #090d14 48%, #05070b 100%), radial-gradient(900px 520px at 20% 28%, color-mix(in srgb, var(--earth-accent-sky) 50%, black) 0%, transparent 60%), radial-gradient(840px 500px at 84% 16%, color-mix(in srgb, var(--earth-accent-clay) 34%, black) 0%, transparent 62%), radial-gradient(760px 440px at 62% 78%, color-mix(in srgb, var(--earth-accent-moss) 34%, black) 0%, transparent 66%)',
          opacity: 0.92,
          filter: 'blur(58px) saturate(118%)',
          transform: 'scale(1.1)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(700px 360px at 26% 34%, color-mix(in srgb, var(--earth-accent-sky) 28%, black) 0%, transparent 70%), radial-gradient(680px 320px at 76% 62%, color-mix(in srgb, var(--earth-green-700) 24%, black) 0%, transparent 74%)',
          mixBlendMode: 'screen',
          opacity: 0.42,
          filter: 'blur(22px)',
          transform: 'translateY(12px) scale(1.04)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 20% 25%, rgba(255,255,255,0.08) 0 1px, transparent 1.5px), radial-gradient(circle at 72% 31%, rgba(255,255,255,0.07) 0 1px, transparent 1.6px), radial-gradient(circle at 34% 70%, rgba(255,255,255,0.06) 0 1px, transparent 1.6px), radial-gradient(circle at 83% 78%, rgba(255,255,255,0.06) 0 1px, transparent 1.4px), radial-gradient(circle at 58% 19%, rgba(255,255,255,0.05) 0 1px, transparent 1.5px)',
          opacity: 0.35,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 34%, rgba(5, 7, 11, 0.42) 70%, rgba(2, 3, 6, 0.75) 100%), linear-gradient(180deg, rgba(7, 10, 16, 0.16) 0%, rgba(5, 7, 12, 0.58) 100%)',
        }}
      />
      <div className="plantera-galaxy-shine pointer-events-none absolute inset-0" />
      {!isGlobeReady ? (
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400"></div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-300">Loading Plantera Globe</p>
              <p className="mt-1 text-xs text-slate-400">{overlayLoadingStatus || 'Preparing the world...'}</p>
            </div>
          </div>
        </div>
      ) : null}
      {globeSize.width > 0 && globeSize.height > 0 && isGlobeReady ? (
        <Globe
          ref={globeRef}
          width={globeSize.width}
          height={globeSize.height}
          globeImageUrl={SOLID_GLOBE_IMAGE_URL}
          backgroundColor="#00000000"
          showAtmosphere={!isMobilePerformanceMode}
          atmosphereColor="#67e8f9"
          atmosphereAltitude={isMobilePerformanceMode ? 0.12 : 0.22}
          polygonsData={activePolygons}
          polygonCapColor={polygonCapColor}
          polygonSideColor={polygonSideColor}
          polygonStrokeColor={polygonStrokeColor}
          polygonAltitude={polygonAltitude}
          polygonsTransitionDuration={polygonTransitionDuration}
          polygonLabel={polygonLabel}
          onPolygonHover={handlePolygonHover}
          onPolygonClick={handlePolygonClick}
          pointsData={deferredZoomLevel === 'close' && !isMobilePerformanceMode ? cities : []}
          pointLat="lat"
          pointLng="lng"
          pointAltitude={0.008}
          pointRadius={0.36}
          pointColor={pointColor}
          pointLabel={pointLabel}
          objectsData={visiblePlants}
          objectLat="lat"
          objectLng="lng"
          objectAltitude={0.006}
          objectFacesSurface
          objectThreeObject={objectThreeObject}
          objectLabel={plantObjectLabel}
          onObjectClick={handlePlantClick}
        />
      ) : null}

      {isGlobeReady && (
        <>
          <PlantSidebar
        open={isSidebarOpen}
        loading={isSidebarLoading}
        errorMessage={sidebarError}
        data={sidebarData}
        onClose={handleSidebarClose}
      />
        </>
      )}

      {(overlayLoadingStatus || plantLoadingStatus) && (
        <div className="pointer-events-none absolute left-4 top-4 text-xs font-medium tracking-wide sm:left-6 sm:top-6">
          {overlayLoadingStatus && (
            <div className="text-cyan-400">{overlayLoadingStatus}</div>
          )}
          {plantLoadingStatus && (
            <div className="text-amber-300">{plantLoadingStatus}</div>
          )}
        </div>
      )}

      {isGlobeReady && user && (
        <Link to="/profile" className="group absolute right-4 top-4 z-40 sm:right-6 sm:top-6" aria-label="Open profile">
          <div className="relative h-12 w-12 overflow-hidden rounded-full border border-[color:color-mix(in_srgb,var(--earth-sand-100)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--earth-green-900)_78%,black)] shadow-[0_10px_30px_rgba(10,14,22,0.45),inset_0_1px_0_rgba(255,255,255,0.2)] ring-1 ring-[color:color-mix(in_srgb,var(--earth-accent-sky)_28%,transparent)] backdrop-blur-md">
            <img
              src={userAvatarUrl || DEFAULT_AVATAR_DATA_URI}
              alt={userName}
              className="h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.src = DEFAULT_AVATAR_DATA_URI
              }}
            />
          </div>
          <div className="pointer-events-none absolute right-0 top-[calc(100%+10px)] w-[240px] translate-y-1 rounded-xl border border-[color:color-mix(in_srgb,var(--earth-sand-100)_20%,transparent)] bg-[color:color-mix(in_srgb,var(--earth-stone-900)_58%,black)] px-3 py-2 text-xs text-[var(--earth-sand-100)] opacity-0 shadow-[0_18px_34px_rgba(5,7,12,0.55)] backdrop-blur-xl transition duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
            <div className="truncate font-semibold text-[color:color-mix(in_srgb,var(--earth-sand-100)_94%,white)]">{userName}</div>
            <div className="truncate text-[color:color-mix(in_srgb,var(--earth-sand-100)_72%,var(--earth-stone-300))]">{user.email}</div>
          </div>
        </Link>
      )}
    </section>
  )
}

export default GlobeView
