declare module 'three' {
  export const SRGBColorSpace: string

  export class Vector3 {
    constructor(x?: number, y?: number, z?: number)
    x: number
    y: number
    z: number
    set(x: number, y: number, z: number): this
    setScalar(scalar: number): this
    multiply(vector: Vector3): this
    multiplyScalar(scalar: number): this
    add(vector: Vector3): this
    sub(vector: Vector3): this
    clone(): Vector3
    getSize?(target: Vector3): Vector3
    length(): number
  }

  export class Euler {
    constructor(x?: number, y?: number, z?: number)
    x: number
    y: number
    z: number
  }

  export type Material = {
    dispose(): void
  }

  export class Object3D {
    position: Vector3
    rotation: Euler
    scale: Vector3
    children: Object3D[]
    traverse(callback: (node: Object3D) => void): void
    add(...objects: Object3D[]): this
    clone(recursive?: boolean): Object3D
  }

  export class Mesh extends Object3D {
    isMesh: boolean
    geometry?: { dispose(): void }
    material?: Material | Material[]
    castShadow: boolean
    receiveShadow: boolean
  }

  export class Group extends Object3D {}
  export class Scene extends Object3D {}

  export class Box3 {
    setFromObject(object: Object3D): this
    getSize(target: Vector3): Vector3
    getCenter(target: Vector3): Vector3
  }

  export class PerspectiveCamera extends Object3D {
    constructor(fov?: number, aspect?: number, near?: number, far?: number)
    aspect: number
    updateProjectionMatrix(): void
    lookAt(x: number, y: number, z: number): void
  }

  export class WebGLRenderer {
    constructor(parameters?: { antialias?: boolean; alpha?: boolean; powerPreference?: string })
    domElement: HTMLCanvasElement
    outputColorSpace: string
    setPixelRatio(ratio: number): void
    setSize(width: number, height: number, updateStyle?: boolean): void
    render(scene: Scene, camera: PerspectiveCamera): void
    dispose(): void
  }

  export class HemisphereLight extends Object3D {
    constructor(skyColor?: number, groundColor?: number, intensity?: number)
  }

  export class DirectionalLight extends Object3D {
    constructor(color?: number, intensity?: number)
  }

  export class Clock {
    getElapsedTime(): number
  }

  export class LoadingManager {}
  export class Loader {}
}
