/// <reference lib="webworker" />

import type { ClusteredPlantedPlant, PlantedPlant } from './types'
import type { GlobeViewportBounds } from './types'

type WorkerRequest = {
  requestId: number
  plants: PlantedPlant[]
  viewport: GlobeViewportBounds
  precision: number
  maxVisiblePlants: number
  pov: {
    lat: number
    lng: number
  }
}

type WorkerResponse = {
  requestId: number
  visiblePlants: ClusteredPlantedPlant[]
}

function normalizeLng(lng: number): number {
  if (lng > 180) return lng - 360
  if (lng < -180) return lng + 360
  return lng
}

function isLngInsideBounds(lng: number, minLng: number, maxLng: number): boolean {
  if (minLng <= maxLng) return lng >= minLng && lng <= maxLng
  return lng >= minLng || lng <= maxLng
}

function filterVisiblePlants(plants: PlantedPlant[], viewport: GlobeViewportBounds): PlantedPlant[] {
  const { minLat, maxLat, minLng, maxLng } = viewport

  return plants.filter((plant) => {
    const insideLat = plant.lat >= minLat && plant.lat <= maxLat
    if (!insideLat) return false
    return isLngInsideBounds(plant.lng, minLng, maxLng)
  })
}

function coordinateKey(lat: number, lng: number, precision: number): string {
  return `${lat.toFixed(precision)}:${lng.toFixed(precision)}`
}

function collapsePlantsByCoordinate(
  plants: PlantedPlant[],
  precision: number,
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

function angularDistance(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const latDistance = aLat - bLat
  const lngDelta = Math.abs(normalizeLng(aLng) - normalizeLng(bLng))
  const lngDistance = Math.min(lngDelta, 360 - lngDelta) * Math.cos((aLat * Math.PI) / 180)

  return Math.sqrt(latDistance * latDistance + lngDistance * lngDistance)
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { requestId, plants, viewport, precision, maxVisiblePlants, pov } = event.data
  const viewportPlants = filterVisiblePlants(plants, viewport)
  const collapsedPlants = collapsePlantsByCoordinate(viewportPlants, precision)

  const visiblePlants = collapsedPlants
    .sort(
      (a, b) =>
        angularDistance(a.lat, a.lng, pov.lat, pov.lng) -
        angularDistance(b.lat, b.lng, pov.lat, pov.lng),
    )
    .slice(0, maxVisiblePlants)

  const payload: WorkerResponse = {
    requestId,
    visiblePlants,
  }

  self.postMessage(payload)
}

export {}
