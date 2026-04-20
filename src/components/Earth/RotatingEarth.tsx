import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import earthModelUrl from '../../assets/low_poly_planet_earth.glb?url'

type RotatingEarthProps = {
  className?: string
  modelSize?: number
  cameraDistance?: number
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

export default function RotatingEarth({
  className,
  modelSize = 3,
  cameraDistance = 5.3,
}: RotatingEarthProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
    camera.position.set(0, 0.25, cameraDistance)
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

    const hemisphereLight = new THREE.HemisphereLight(0xd7fce6, 0x2b1f16, 1.0)
    hemisphereLight.position.set(0, 3, 0)
    scene.add(hemisphereLight)

    const keyLight = new THREE.DirectionalLight(0xfef3c7, 1.35)
    keyLight.position.set(4, 2, 3)
    scene.add(keyLight)

    const rimLight = new THREE.DirectionalLight(0x8dc5ff, 0.75)
    rimLight.position.set(-4, -1, -3)
    scene.add(rimLight)

    const worldGroup = new THREE.Group()
    scene.add(worldGroup)

    const loader = new GLTFLoader()
    let earthModel: THREE.Object3D | null = null

    loader.load(
      earthModelUrl,
      (gltf) => {
        earthModel = gltf.scene

        const initialBox = new THREE.Box3().setFromObject(earthModel)
        const size = initialBox.getSize(new THREE.Vector3()).length()
        const targetSize = modelSize
        const scale = size > 0 ? targetSize / size : 1

        earthModel.scale.setScalar(scale)

        // Align the model center with world origin so rotation stays centered in the wrapper.
        const centeredBox = new THREE.Box3().setFromObject(earthModel)
        const center = centeredBox.getCenter(new THREE.Vector3())
        earthModel.position.sub(center)

        worldGroup.add(earthModel)
      },
      undefined,
      (error) => {
        console.error('Failed to load Earth model:', error)
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

    let frameId = 0
    const clock = new THREE.Clock()

    const animate = () => {
      const elapsed = clock.getElapsedTime()
      worldGroup.rotation.y = elapsed * 0.22
      worldGroup.rotation.x = Math.sin(elapsed * 0.5) * 0.08
      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }

    frameId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()

      if (earthModel) {
        disposeScene(earthModel)
      }

      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [cameraDistance, modelSize])

  return <div ref={mountRef} className={className} aria-label="Rotating Earth model"  />
}
