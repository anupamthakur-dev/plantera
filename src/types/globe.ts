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
  enabled: boolean
  autoRotate: boolean
  autoRotateSpeed: number
  minDistance: number
  maxDistance: number
  addEventListener: (event: 'change', listener: () => void) => void
  removeEventListener: (event: 'change', listener: () => void) => void
}

type GlobeRenderer = {
  setPixelRatio: (value: number) => void
  shadowMap: {
    enabled: boolean
  }
}

export type GlobeHandle = {
  controls: () => GlobeControls
  pauseAnimation?: () => void
  resumeAnimation?: () => void
  scene?: () => {
    add: (object: unknown) => void
    remove: (object: unknown) => void
  }
  renderer?: () => GlobeRenderer
  pointOfView: {
    (): Partial<GlobePointOfView>
    (pov: GlobePointOfView, ms?: number): void
  }
}
