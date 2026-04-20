import { getPlantModel } from './plantModels'
import type { PlantedPlant, RenderablePlant } from './types'

export function renderPlants(plantedPlants: PlantedPlant[]): RenderablePlant[] {
  return plantedPlants.map((plant) => ({
    id: plant.id,
    model: getPlantModel(plant.type),
    lat: plant.lat,
    lng: plant.lng,
    scale: plant.scale,
  }))
}
