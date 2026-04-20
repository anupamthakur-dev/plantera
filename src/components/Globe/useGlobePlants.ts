import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import treeModelUrl from '../../assets/plants/tree.glb'
import { isSupabaseConfigured } from '../../features/auth'
import type { GlobePointOfView, ZoomLevel } from '../../types/globe'
import { fetchPlantsInViewport } from '../../services/planting'
import {
  createMemoizedPlantModelLoader,
  collapsePlantsByCoordinate,
  filterVisiblePlants,
  getPlantModel,
  plantedPlantsDummyData,
  renderPlants,
  type ClusteredPlantedPlant,
  type PlantType,
  type PlantedPlant,
  type RenderablePlant,
} from './plants'

type AddPlantInput = {
  lat: number
  lng: number
  name?: string
  type?: PlantType
  scale?: number
  userId?: string
}

type UseGlobePlantsInput = {
  pov: Pick<GlobePointOfView, 'lat' | 'lng'>
  zoomLevel: ZoomLevel
}

const NORMALIZED_TEMPLATE_HEIGHT = 1
const BASE_PLANT_SCALE = 2
const MIN_PLANT_SCALE = 0.4
const MAX_PLANT_SCALE = 4
const VIEWPORT_OVERSCAN_BY_ZOOM: Record<ZoomLevel, number> = {
  far: 0.2,
  medium: 0.16,
  close: 0.12,
}
const FETCH_DEBOUNCE_MS_BY_ZOOM: Record<ZoomLevel, number> = {
  far: 260,
  medium: 220,
  close: 160,
}

function getZoomScaleMultiplier(zoomLevel: ZoomLevel): number {
  if (zoomLevel === 'far') return 6
  if (zoomLevel === 'medium') return 4
  return 1
}

function getRenderPlantScale(zoomLevel: ZoomLevel, plantScale?: number): number {
  const baseScale = plantScale ?? BASE_PLANT_SCALE
  const scaled = baseScale * getZoomScaleMultiplier(zoomLevel)
  return Math.min(MAX_PLANT_SCALE, Math.max(MIN_PLANT_SCALE, scaled))
}

function normalizeLng(lng: number): number {
  if (lng > 180) return lng - 360
  if (lng < -180) return lng + 360
  return lng
}

function getViewportFromPov(pov: Pick<GlobePointOfView, 'lat' | 'lng'>, zoomLevel: ZoomLevel) {
  const latSpanByZoom: Record<ZoomLevel, number> = {
    far: 120,
    medium: 54,
    close: 20,
  }

  const latSpan = latSpanByZoom[zoomLevel]
  const lngSpan = latSpan * 1.55

  return {
    minLat: Math.max(-90, pov.lat - latSpan / 2),
    maxLat: Math.min(90, pov.lat + latSpan / 2),
    minLng: normalizeLng(pov.lng - lngSpan / 2),
    maxLng: normalizeLng(pov.lng + lngSpan / 2),
  }
}

function expandViewport(
  viewport: ReturnType<typeof getViewportFromPov>,
  zoomLevel: ZoomLevel,
) {
  const latPadding = (viewport.maxLat - viewport.minLat) * VIEWPORT_OVERSCAN_BY_ZOOM[zoomLevel]
  const lngPadding = 360 * VIEWPORT_OVERSCAN_BY_ZOOM[zoomLevel] * 0.5

  return {
    minLat: Math.max(-90, viewport.minLat - latPadding),
    maxLat: Math.min(90, viewport.maxLat + latPadding),
    minLng: normalizeLng(viewport.minLng - lngPadding),
    maxLng: normalizeLng(viewport.maxLng + lngPadding),
  }
}

function getViewportCacheKey(viewport: ReturnType<typeof getViewportFromPov>, zoomLevel: ZoomLevel) {
  return [
    zoomLevel,
    viewport.minLat.toFixed(2),
    viewport.maxLat.toFixed(2),
    viewport.minLng.toFixed(2),
    viewport.maxLng.toFixed(2),
  ].join(':')
}

function hashSeed(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

function prepareTemplate(template: THREE.Object3D): THREE.Object3D {
  const bounds = new THREE.Box3().setFromObject(template)
  const size = new THREE.Vector3()
  bounds.getSize(size)

  const targetHeight = NORMALIZED_TEMPLATE_HEIGHT
  const currentHeight = size.y > 0 ? size.y : 1
  const scale = targetHeight / currentHeight
  template.scale.setScalar(scale)

  template.traverse((node) => {
    const mesh = node as THREE.Mesh & { castShadow: boolean; receiveShadow: boolean }
    if (!mesh.isMesh) return
    mesh.castShadow = false
    mesh.receiveShadow = false
  })

  // Align GLB orientation with globe surface orientation in objectFacesSurface mode.
  template.rotation.x = Math.PI / 2

  return template
}

function loadGltfTemplate(loader: GLTFLoader, modelPath: string): Promise<THREE.Object3D> {
  return new Promise((resolve, reject) => {
    loader.load(
      modelPath,
      (gltf) => {
        resolve(prepareTemplate(gltf.scene))
      },
      undefined,
      reject,
    )
  })
}

function resolveModelPath(type: PlantType): string {
  if (type === 'tree') return treeModelUrl
  return getPlantModel(type)
}

export function useGlobePlants({ pov, zoomLevel }: UseGlobePlantsInput) {
  const [plants, setPlants] = useState<PlantedPlant[]>(() => (isSupabaseConfigured ? [] : plantedPlantsDummyData))
  const [loadedTypes, setLoadedTypes] = useState<Set<PlantType>>(new Set())
  const [modelRevision, setModelRevision] = useState(0)
  const [loadingStatus, setLoadingStatus] = useState('')
  const viewportCacheRef = useRef(new Map<string, PlantedPlant[]>())
  const fetchRequestIdRef = useRef(0)
  const modelTemplatesRef = useRef(new Map<PlantType, THREE.Object3D>())
  const loadInFlightRef = useRef(new Set<PlantType>())
  const loaderRef = useRef(new GLTFLoader())

  const memoizedModelLoaderRef = useRef(
    createMemoizedPlantModelLoader<THREE.Object3D>((modelPath) =>
      loadGltfTemplate(loaderRef.current, modelPath),
      resolveModelPath,
    ),
  )

  const ensureModelLoaded = useCallback((type: PlantType) => {
    if (modelTemplatesRef.current.has(type) || loadInFlightRef.current.has(type)) return

    loadInFlightRef.current.add(type)

    memoizedModelLoaderRef.current(type)
      .then((template) => {
        modelTemplatesRef.current.set(type, template)
        setLoadedTypes((prev) => {
          const next = new Set(prev)
          next.add(type)
          return next
        })
        setModelRevision((rev) => rev + 1)
      })
      .catch((error) => {
        console.error(`Could not load model for type "${type}"`, error)
      })
      .finally(() => {
        loadInFlightRef.current.delete(type)
      })
  }, [])

  useEffect(() => {
    ensureModelLoaded('tree')
  }, [ensureModelLoaded])

  const viewport = useMemo(() => getViewportFromPov(pov, zoomLevel), [pov, zoomLevel])
  const fetchViewport = useMemo(() => expandViewport(viewport, zoomLevel), [viewport, zoomLevel])

  useEffect(() => {
    if (!isSupabaseConfigured) return

    const cacheKey = getViewportCacheKey(fetchViewport, zoomLevel)
    const cachedPlants = viewportCacheRef.current.get(cacheKey)
    if (cachedPlants) {
      setPlants(cachedPlants)
      setLoadingStatus('')
      return
    }

    let cancelled = false
    const requestId = fetchRequestIdRef.current + 1
    fetchRequestIdRef.current = requestId

    setLoadingStatus('Loading nearby plants...')

    const timer = window.setTimeout(() => {
      void fetchPlantsInViewport(fetchViewport)
        .then((nextPlants) => {
          if (cancelled || fetchRequestIdRef.current !== requestId) return

          viewportCacheRef.current.set(cacheKey, nextPlants)
          setPlants(nextPlants)
          setLoadingStatus('')
        })
        .catch((error) => {
          if (cancelled || fetchRequestIdRef.current !== requestId) return

          console.error('Could not load planted globe data', error)
          setPlants([])
          setLoadingStatus('Could not load planted plants')
        })
    }, FETCH_DEBOUNCE_MS_BY_ZOOM[zoomLevel])

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [fetchViewport, zoomLevel])

  const visiblePlantTypes = useMemo(() => {
    return Array.from(new Set(plants.map((plant) => plant.type)))
  }, [plants])

  useEffect(() => {
    for (const type of visiblePlantTypes) {
      ensureModelLoaded(type)
    }
  }, [ensureModelLoaded, visiblePlantTypes])

  const visiblePlants = useMemo<ClusteredPlantedPlant[]>(() => {
    const viewport = getViewportFromPov(pov, zoomLevel)
    const viewportPlants = filterVisiblePlants(plants, viewport)
    return collapsePlantsByCoordinate(viewportPlants, 5)
  }, [plants, pov, zoomLevel])

  const renderablePlants = useMemo<RenderablePlant[]>(() => {
    return renderPlants(visiblePlants)
  }, [visiblePlants])

  const addPlantAt = useCallback(({ lat, lng, name, type, userId }: AddPlantInput) => {
    const plantType: PlantType = type ?? 'tree'
    const nextId = `plant-${Date.now()}-${Math.round((lat + lng) * 1000)}`

    setPlants((prev) => {
      const nextPlant: PlantedPlant = {
        id: nextId,
        name: name ?? `${plantType} plant`,
        type: plantType,
        lat,
        lng,
        scale: BASE_PLANT_SCALE,
        userId: userId ?? 'anupam',
        plantedAt: Date.now(),
      }

      return [...prev, nextPlant]
    })

    ensureModelLoaded(plantType)
  }, [ensureModelLoaded])

  const objectThreeObject = useCallback((plant: ClusteredPlantedPlant) => {
    const template = modelTemplatesRef.current.get(plant.type)
    if (!template) {
      ensureModelLoaded(plant.type)
      return new THREE.Object3D()
    }

    const object = template.clone(true)
    const spinDegrees = hashSeed(plant.id) % 360
    object.rotation.y = (spinDegrees * Math.PI) / 180
    const renderScale = getRenderPlantScale(zoomLevel, plant.scale)
    object.scale.multiply(new THREE.Vector3(renderScale, renderScale, renderScale))

    return object
  }, [ensureModelLoaded, modelRevision, zoomLevel])

  return {
    plants,
    visiblePlants,
    renderablePlants,
    addPlantAt,
    objectThreeObject,
    isPlantModelReady: loadedTypes.has('tree'),
    loadedPlantTypes: loadedTypes,
    loadingStatus,
  }
}
