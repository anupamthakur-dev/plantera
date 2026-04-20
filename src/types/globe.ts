import type { Feature, Geometry } from 'geojson'

export type ZoomLevel = 'far' | 'medium' | 'close'

export type AreaFeature = Feature<Geometry, { id?: string; name?: string; country?: string }>

export type StateCollection = {
  type: 'FeatureCollection'
  features: AreaFeature[]
}

export type City = {
  id: string
  name: string
  country: string
  state: string
  lat: number
  lng: number
  population: number
}

export type PlantedTree = {
  id: string
  areaId: string
  lat: number
  lng: number
}

export type GlobePointOfView = {
  lat: number
  lng: number
  altitude: number
}

export type GlobeControls = {
  enableDamping: boolean
  dampingFactor: number
  rotateSpeed: number
  zoomSpeed: number
  autoRotate: boolean
  autoRotateSpeed: number
  minDistance: number
  maxDistance: number
}

export type GlobeHandle = {
  controls: () => GlobeControls
  pointOfView: {
    (): Partial<GlobePointOfView>
    (pov: GlobePointOfView, ms?: number): void
  }
}
