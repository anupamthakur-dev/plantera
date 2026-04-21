import { getPlantModel } from './plantModels'
import type {
  ClusteredPlantedPlant,
  GlobeViewportBounds,
  GroupedPlantsByType,
  InstancedPlantBatch,
  PlantedPlant,
  PlantModelLoader,
  PlantModelResolver,
  PlantType,
} from './types'

const DEFAULT_PLANT_CLUSTER_RADIUS_METERS = 25
const METERS_PER_DEGREE_LAT = 111_320

function isLngInsideBounds(lng: number, minLng: number, maxLng: number): boolean {
  if (minLng <= maxLng) return lng >= minLng && lng <= maxLng
  return lng >= minLng || lng <= maxLng
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180
}

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const earthRadiusMeters = 6_371_000
  const latDelta = toRadians(bLat - aLat)
  const lngDelta = toRadians(bLng - aLng)
  const sinLat = Math.sin(latDelta / 2)
  const sinLng = Math.sin(lngDelta / 2)
  const a =
    sinLat * sinLat +
    Math.cos(toRadians(aLat)) * Math.cos(toRadians(bLat)) * sinLng * sinLng

  return 2 * earthRadiusMeters * Math.asin(Math.min(1, Math.sqrt(a)))
}

function getBucketIndex(value: number, cellSize: number): number {
  return Math.floor(value / cellSize)
}

function getNeighborKeys(latBucket: number, lngBucket: number): string[] {
  const keys: string[] = []

  for (let latOffset = -1; latOffset <= 1; latOffset += 1) {
    for (let lngOffset = -1; lngOffset <= 1; lngOffset += 1) {
      keys.push(`${latBucket + latOffset}:${lngBucket + lngOffset}`)
    }
  }

  return keys
}

export function groupPlantsByType(plants: PlantedPlant[]): GroupedPlantsByType {
  const grouped: GroupedPlantsByType = {
    tree: [],
    bush: [],
    flower: [],
    desert: [],
  }

  for (const plant of plants) {
    grouped[plant.type].push(plant)
  }

  return grouped
}

export function filterVisiblePlants(
  plants: PlantedPlant[],
  viewport: GlobeViewportBounds,
): PlantedPlant[] {
  const { minLat, maxLat, minLng, maxLng } = viewport

  return plants.filter((plant) => {
    const insideLat = plant.lat >= minLat && plant.lat <= maxLat
    if (!insideLat) return false

    return isLngInsideBounds(plant.lng, minLng, maxLng)
  })
}

export function collapsePlantsByProximity(
  plants: PlantedPlant[],
  radiusMeters: number = DEFAULT_PLANT_CLUSTER_RADIUS_METERS,
): PlantedPlant[] {
  if (plants.length <= 1) return plants

  const cellSizeDegrees = radiusMeters / METERS_PER_DEGREE_LAT
  const buckets = new Map<string, PlantedPlant[]>()
  const collapsed: PlantedPlant[] = []

  for (const plant of plants) {
    const latBucket = getBucketIndex(plant.lat, cellSizeDegrees)
    const lngBucket = getBucketIndex(plant.lng, cellSizeDegrees)
    const neighborKeys = getNeighborKeys(latBucket, lngBucket)

    let isClustered = false

    for (const key of neighborKeys) {
      const candidates = buckets.get(key)
      if (!candidates) continue

      for (const candidate of candidates) {
        if (distanceMeters(plant.lat, plant.lng, candidate.lat, candidate.lng) <= radiusMeters) {
          isClustered = true
          break
        }
      }

      if (isClustered) break
    }

    if (isClustered) continue

    collapsed.push(plant)

    const bucketKey = `${latBucket}:${lngBucket}`
    const bucketPlants = buckets.get(bucketKey)
    if (bucketPlants) {
      bucketPlants.push(plant)
    } else {
      buckets.set(bucketKey, [plant])
    }
  }

  return collapsed
}

function coordinateKey(lat: number, lng: number, precision: number): string {
  return `${lat.toFixed(precision)}:${lng.toFixed(precision)}`
}

export function collapsePlantsByCoordinate(
  plants: PlantedPlant[],
  precision: number = 5,
): ClusteredPlantedPlant[] {
  const grouped = new Map<string, ClusteredPlantedPlant>()

  for (const plant of plants) {
    const key = coordinateKey(plant.lat, plant.lng, precision)
    const existing = grouped.get(key)

    if (!existing) {
      grouped.set(key, {
        ...plant,
        coordinateKey: key,
        plantedCount: 1,
        contributorUserIds: [plant.userId],
      })
      continue
    }

    const nextUsers = existing.contributorUserIds.includes(plant.userId)
      ? existing.contributorUserIds
      : [...existing.contributorUserIds, plant.userId]

    const latestPlant = plant.plantedAt >= existing.plantedAt ? plant : existing

    grouped.set(key, {
      ...existing,
      ...latestPlant,
      plantedCount: existing.plantedCount + 1,
      contributorUserIds: nextUsers,
      plantedAt: Math.max(existing.plantedAt, plant.plantedAt),
    })
  }

  return [...grouped.values()]
}

export function createMemoizedPlantModelLoader<TModel>(
  loader: PlantModelLoader<TModel>,
  resolveModelPath?: PlantModelResolver,
): (type: PlantType) => Promise<TModel> {
  const cache = new Map<PlantType, Promise<TModel>>()

  return (type: PlantType) => {
    const cached = cache.get(type)
    if (cached) return cached

    const modelPath = resolveModelPath ? resolveModelPath(type) : getPlantModel(type)
    const loadingPromise = loader(modelPath)
    cache.set(type, loadingPromise)

    return loadingPromise
  }
}

export function buildInstancedPlantBatches(plants: PlantedPlant[]): InstancedPlantBatch[] {
  const grouped = groupPlantsByType(plants)

  return (Object.keys(grouped) as PlantType[]).map((type) => {
    const typedPlants = grouped[type]
    return {
      type,
      model: getPlantModel(type),
      count: typedPlants.length,
      plants: typedPlants,
    }
  })
}
