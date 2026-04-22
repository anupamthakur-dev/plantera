import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { PlantType } from '../Globe/plants'
import { getPlantModel } from '../Globe/plants'

type PlantTypeModelBadgeProps = {
  type: PlantType
  className?: string
}

function disposeScene(root: THREE.Object3D) {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh
    if (!mesh.isMesh) return

    mesh.geometry?.dispose()

    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((material) => material.dispose())
      return
    }

    mesh.material?.dispose()
  })
}

export function PlantTypeModelBadge({ type, className }: PlantTypeModelBadgeProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const modelPath = useMemo(() => getPlantModel(type), [type])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
    camera.position.set(0, 0.22, 4.5)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8))
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    mount.appendChild(renderer.domElement)

    const hemisphereLight = new THREE.HemisphereLight(0xdaf8e8, 0x473024, 1.1)
    hemisphereLight.position.set(0, 3, 0)
    scene.add(hemisphereLight)

    const keyLight = new THREE.DirectionalLight(0xfff2cf, 1.4)
    keyLight.position.set(4, 2, 3)
    scene.add(keyLight)

    const rimLight = new THREE.DirectionalLight(0x95c8ff, 0.65)
    rimLight.position.set(-4, -1, -2)
    scene.add(rimLight)

    const worldGroup = new THREE.Group()
    scene.add(worldGroup)

    let plantModel: THREE.Object3D | null = null
    const loader = new GLTFLoader()

    loader.load(
      modelPath,
      (gltf) => {
        plantModel = gltf.scene

        const initialBounds = new THREE.Box3().setFromObject(plantModel)
        const size = initialBounds.getSize(new THREE.Vector3()).length()
        const scale = size > 0 ? 2.35 / size : 1
        plantModel.scale.setScalar(scale)

        const centeredBounds = new THREE.Box3().setFromObject(plantModel)
        const center = centeredBounds.getCenter(new THREE.Vector3())
        plantModel.position.sub(center)

        worldGroup.add(plantModel)
      },
      undefined,
      (error) => {
        console.error('Could not load plant badge model', error)
      },
    )

    const resize = () => {
      const width = mount.clientWidth
      const height = mount.clientHeight
      if (!width || !height) return

      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, true)
    }

    resize()

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(mount)

    const clock = new THREE.Clock()
    let frameId = 0

    const animate = () => {
      const elapsed = clock.getElapsedTime()
      worldGroup.rotation.y = elapsed * 0.7
      worldGroup.rotation.x = Math.sin(elapsed * 0.65) * 0.08
      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }

    frameId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()

      if (plantModel) {
        disposeScene(plantModel)
      }

      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [modelPath])

  return <div ref={mountRef} className={className} aria-label={`${type} model`} />
}
