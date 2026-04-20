import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import Globe from 'react-globe.gl'
import { geoCentroid } from 'd3'
import { feature as topojsonFeature } from 'topojson-client'
import type { FeatureCollection, Geometry } from 'geojson'
import { useGlobeZoom } from './useGlobeZoom'
import { useGlobePlants } from './useGlobePlants'
import { PlantSidebar } from './PlantSidebar'
import { useAuth } from '../../features/auth'
import { fetchPlantSidebarData, type PlantSidebarData } from '../../services/planting'
import type { ClusteredPlantedPlant } from './plants'
import type {
  AreaFeature,
  City,
  GlobeHandle,
  StateCollection,
  ZoomLevel,
} from '../../types/globe'

const COUNTRIES_TOPO_URL =
  'https://unpkg.com/world-atlas@2/countries-110m.json'
const STATES_GEOJSON_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson'

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

function layerLabelByZoom(zoomLevel: ZoomLevel): string {
  if (zoomLevel === 'far') return 'Countries'
  if (zoomLevel === 'medium') return 'States'
  return 'States + Cities'
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
  const { zoomLevel, altitude, pov } = useGlobeZoom(globeRef)
  const { user, signOut } = useAuth()
  const {
    plants,
    visiblePlants,
    objectThreeObject,
    isPlantModelReady,
    loadedPlantTypes,
    loadingStatus: plantLoadingStatus,
  } = useGlobePlants({ pov, zoomLevel })
  const deferredZoomLevel = useDeferredValue(zoomLevel)

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
            1400,
          )
        },
        () => {
          if (!globeRef.current) return
          globeRef.current.pointOfView(defaultPov, 0)
        },
        {
          enableHighAccuracy: false,
          timeout: 6000,
          maximumAge: 300000,
        },
      )
    }

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
    if (states.length || statesLoadingRef.current) return;

    let cancelled = false
    statesLoadingRef.current = true

    const loadStates = async () => {
      setOverlayLoadingStatus('Loading states...')

      try {
        const response = await fetch(STATES_GEOJSON_URL)
        if (!response.ok) {
          throw new Error(`State boundary request failed with status ${response.status}`)
        }

        const stateCollection =
          (await response.json()) as FeatureCollection<Geometry>

        if (!Array.isArray(stateCollection.features) || stateCollection.features.length === 0) {
          throw new Error('Remote state boundary payload did not include features')
        }

        startTransition(() => {
          setStates(stateCollection.features as AreaFeature[])
          setOverlayLoadingStatus('')
        })
        
      } catch (error) {
        try {
          const module = await import('../../data/states.json')

          if (!cancelled) {
            const fallbackStates = module.default as StateCollection

            if (!Array.isArray(fallbackStates.features) || fallbackStates.features.length === 0) {
              throw new Error('Fallback state dataset is empty')
            }

            startTransition(() => {
              setStates(fallbackStates.features)
              setOverlayLoadingStatus('')
            })
          }
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
  }, [])

  useEffect(() => {
    if (zoomLevel !== 'close' || cities.length) return

    let cancelled = false

    const loadCities = async () => {
      const module = await import('../../data/cities.json')
      if (!cancelled) {
        startTransition(() => {
          setCities(module.default as City[])
        })
      }
    }

     loadCities()

    return () => {
      cancelled = true
    }
  }, [zoomLevel, cities.length])

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

    const maxDistance = deferredZoomLevel === 'close' ? CLOSE_STATE_DISTANCE : MEDIUM_STATE_DISTANCE
    const maxStates = deferredZoomLevel === 'close' ? CLOSE_STATE_LIMIT : MEDIUM_STATE_LIMIT
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
  }, [deferredZoomLevel, pov.lat, pov.lng, stateCentroids, states.length])

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

  const polygonTransitionDuration = deferredZoomLevel === 'far' ? COUNTRY_POLYGON_TRANSITION_MS : DENSE_POLYGON_TRANSITION_MS

  return (
    <section ref={containerRef} className="relative h-full min-h-[320px] w-full overflow-hidden">
      {globeSize.width > 0 && globeSize.height > 0 ? (
        <Globe
          ref={globeRef}
          width={globeSize.width}
          height={globeSize.height}
          globeImageUrl={SOLID_GLOBE_IMAGE_URL}
          backgroundColor="#01182900"
          showAtmosphere
          atmosphereColor="#67e8f9"
          atmosphereAltitude={0.22}
          polygonsData={activePolygons}
          polygonCapColor={polygonCapColor}
          polygonSideColor={polygonSideColor}
          polygonStrokeColor={polygonStrokeColor}
          polygonAltitude={polygonAltitude}
          polygonsTransitionDuration={polygonTransitionDuration}
          polygonLabel={polygonLabel}
          onPolygonHover={handlePolygonHover}
          onPolygonClick={handlePolygonClick}
          pointsData={deferredZoomLevel === 'close' ? cities : []}
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

      <PlantSidebar
        open={isSidebarOpen}
        loading={isSidebarLoading}
        errorMessage={sidebarError}
        data={sidebarData}
        onClose={handleSidebarClose}
      />

      <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-zinc-700/80 bg-zinc-900/75 px-4 py-3 text-xs tracking-wide text-zinc-200 shadow-lg shadow-cyan-500/10 backdrop-blur-sm sm:left-6 sm:top-6">
        <div className="mb-1 font-semibold uppercase text-cyan-300">
          Plantera Globe
        </div>
        <div>Zoom Mode: {zoomLevel}</div>
        <div>Altitude: {altitude.toFixed(2)}</div>
        <div>Layer: {layerLabelByZoom(zoomLevel)}</div>
        <div>Nearby Plants: {plants.length}</div>
        <div>Visible Plants: {visiblePlants.length}</div>
        <div>Loaded Plant Types: {loadedPlantTypes.size}</div>
        <div>Tree Model: {isPlantModelReady ? 'Ready' : 'Loading...'}</div>
        {plantLoadingStatus ? (
          <div className="text-amber-300">{plantLoadingStatus}</div>
        ) : null}
        {overlayLoadingStatus ? (
          <div className="text-cyan-300">{overlayLoadingStatus}</div>
        ) : null}
      </div>

      {user ? (
        <div className="absolute right-4 top-4 rounded-md border border-emerald-500/30 bg-emerald-950/70 px-4 py-3 text-xs tracking-wide text-emerald-100 shadow-lg shadow-emerald-500/10 backdrop-blur-sm sm:right-6 sm:top-6">
          <div className="font-semibold uppercase text-emerald-300">Signed In</div>
          <div className="mt-1 max-w-[220px] truncate">{user.email}</div>
          <button
            type="button"
            onClick={() => {
              void signOut()
            }}
            className="mt-3 inline-flex rounded-lg border border-emerald-400/30 px-3 py-1.5 font-semibold text-emerald-100 transition hover:bg-emerald-900/80"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </section>
  )
}

export default GlobeView
