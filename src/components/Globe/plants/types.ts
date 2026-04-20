export type PlantType = 'tree' | 'bush' | 'grass' | 'flower' | 'desert'

export interface PlantedPlant {
  id: string
  name: string
  type: PlantType
  lat: number
  lng: number
  scale?: number
  userId: string
  plantedAt: number
  quote?: string | null
  userAvatarUrl?: string | null
}

export interface ClusteredPlantedPlant extends PlantedPlant {
  coordinateKey: string
  plantedCount: number
  contributorUserIds: string[]
}

export interface RenderablePlant {
  id: string
  model: string
  lat: number
  lng: number
  scale?: number
}

export interface GlobeViewportBounds {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

export interface InstancedPlantBatch {
  type: PlantType
  model: string
  count: number
  plants: PlantedPlant[]
}

export type GroupedPlantsByType = Record<PlantType, PlantedPlant[]>

export type PlantModelLoader<TModel> = (modelPath: string) => Promise<TModel>
export type PlantModelResolver = (type: PlantType) => string
