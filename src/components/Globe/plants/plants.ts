import type { PlantedPlant } from './types'

const DEHRADUN_LAT = 28.628802478082708
const DEHRADUN_LNG = 77.20135308917567


const DEHRADUN_TREE_OFFSETS: ReadonlyArray<{ lat: number; lng: number }> = [
  { lat: 0.0008, lng: 0.0002 },
  { lat: -0.0007, lng: 0.0006 },
  { lat: 0.0011, lng: -0.0005 },
  { lat: -0.0004, lng: -0.0009 },
  { lat: 0.0003, lng: 0.001 },
  { lat: -0.0012, lng: 0.0001 },
  { lat: 0.0009, lng: -0.0011 },
  { lat: -0.0005, lng: 0.0012 },
  { lat: 0.0013, lng: 0.0007 },
  { lat: -0.0009, lng: -0.0003 },
]

export function createAnupamDehradunTrees(): PlantedPlant[] {
  const now = Date.now()

  return DEHRADUN_TREE_OFFSETS.map((offset, index) => ({
    id: `anupam-dehradun-tree`,
    name: `Dehradun Tree ${index + 1}`,
    type: 'tree',
    lat: DEHRADUN_LAT + offset.lat,
    lng: DEHRADUN_LNG + offset.lng,
    scale: 0.2,
    userId: 'anupam',
    plantedAt: now - (10 - index) * 86_400_000,
    quote: index % 2 === 0 ? 'Plant today so someone can breathe tomorrow.' : 'Roots below, hope above.',
    userAvatarUrl: null,
  }))
}

export const plantedPlantsDummyData: PlantedPlant[] = createAnupamDehradunTrees()
