import type { PlantType } from './types'
import treeUrl from '../../../assets/plants/tree.glb'
import bushUrl from '../../../assets/plants/bush.glb'
import flowerUrl from '../../../assets/plants/flower.glb'
import cactusUrl from '../../../assets/plants/cactus.glb'

export const plantModels: Record<PlantType, string> = {
  tree: treeUrl,
  bush: bushUrl,
  flower: flowerUrl,
  desert: cactusUrl,
}

export function getPlantModel(type: PlantType): string {
  return plantModels[type]
}
