declare module 'three/examples/jsm/loaders/GLTFLoader.js' {
  import { Loader, LoadingManager, Object3D } from 'three'

  export type GLTF = {
    scene: Object3D
  }

  export class GLTFLoader extends Loader {
    constructor(manager?: LoadingManager)
    load(
      url: string,
      onLoad: (gltf: GLTF) => void,
      onProgress?: (event: ProgressEvent<EventTarget>) => void,
      onError?: (error: unknown) => void,
    ): void
  }
}

declare module 'three/examples/jsm/loaders/GLTFLoader' {
  export * from 'three/examples/jsm/loaders/GLTFLoader.js'
  export { GLTFLoader as default } from 'three/examples/jsm/loaders/GLTFLoader.js'
}
