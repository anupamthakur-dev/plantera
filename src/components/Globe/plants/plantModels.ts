import type { PlantType } from './types'

export const plantModels: Record<PlantType, string> = {
  tree: '/models/tree.glb',
  bush: '/models/bush.glb',
  grass: '/models/grass.glb',
  flower: '/models/flower.glb',
  desert: '/models/cactus.glb',
}

export function getPlantModel(type: PlantType): string {
  return plantModels[type]
}
