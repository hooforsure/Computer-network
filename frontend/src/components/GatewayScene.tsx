import { useGLTF } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'

interface GatewaySceneProps {
  focus: number
  transitionBoost: number
}

const SHIP_SIZE = 10.8
const SHIP_POSITION = new THREE.Vector3(2.05, 0.08, 0.15)
const SHIP_ROTATION = new THREE.Euler(-0.12, -0.82, 0.24)

export function GatewayScene(_: GatewaySceneProps) {
  return (
    <Canvas camera={{ position: [0, 0.22, 5.2], fov: 54 }} dpr={[1, 1.7]} gl={{ antialias: true, alpha: false }}>
      <color attach="background" args={['#05070d']} />
      <fog attach="fog" args={['#05070d', 10, 24]} />
      <ambientLight intensity={1.45} />
      <directionalLight position={[-3.5, 4.5, 5]} intensity={3.1} color="#f8fafc" />
      <directionalLight position={[4.5, 1.8, -3]} intensity={1.35} color="#cbd5e1" />
      <pointLight position={[2.8, 1.2, 3.2]} intensity={8} color="#f8fafc" />
      <MovingParticles />
      <Suspense fallback={null}>
        <StationSubject />
      </Suspense>
    </Canvas>
  )
}

function StationSubject() {
  const gltf = useGLTF('/models/space_station_modules.glb')
  const upperShip = useMemo(() => {
    gltf.scene.updateWorldMatrix(true, true)

    const fullBox = new THREE.Box3().setFromObject(gltf.scene)
    const fullCenter = new THREE.Vector3()
    fullBox.getCenter(fullCenter)

    const upper = new THREE.Group()
    const upperMeshes: THREE.Mesh[] = []

    gltf.scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return

      const meshBox = new THREE.Box3().setFromObject(child)
      const meshCenter = new THREE.Vector3()
      meshBox.getCenter(meshCenter)

      if (meshCenter.y > fullCenter.y) {
        upperMeshes.push(child)
      }
    })

    upperMeshes.forEach((mesh) => {
      const copied = mesh.clone(false)
      copied.geometry = mesh.geometry
      copied.material = Array.isArray(mesh.material) ? mesh.material.map((material) => material.clone()) : mesh.material.clone()
      copied.applyMatrix4(mesh.matrixWorld)

      const materials = Array.isArray(copied.material) ? copied.material : [copied.material]
      materials.forEach((material) => {
        if (material instanceof THREE.MeshStandardMaterial) {
          material.metalness = Math.max(material.metalness, 0.38)
          material.roughness = Math.min(material.roughness, 0.55)
          material.envMapIntensity = 1.15
          material.emissive = new THREE.Color('#1f2937')
          material.emissiveIntensity = 0.16
          material.needsUpdate = true
        }
      })

      upper.add(copied)
    })

    const box = new THREE.Box3().setFromObject(upper)
    const center = new THREE.Vector3()
    const size = new THREE.Vector3()
    box.getCenter(center)
    box.getSize(size)

    const maxDim = Math.max(size.x, size.y, size.z) || 1
    const scale = SHIP_SIZE / maxDim

    upper.position.set(-center.x * scale, -center.y * scale, -center.z * scale)
    upper.scale.setScalar(scale)

    return upper
  }, [gltf.scene])

  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.position.copy(SHIP_POSITION)
    ref.current.rotation.set(SHIP_ROTATION.x, SHIP_ROTATION.y + t * 0.12, SHIP_ROTATION.z)
  })

  return (
    <group ref={ref}>
      <primitive object={upperShip} />
    </group>
  )
}

function MovingParticles() {
  const ref = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const count = 1800
    const data = new Float32Array(count * 3)

    for (let index = 0; index < count; index += 1) {
      const radius = 3 + Math.random() * 16
      const angle = Math.random() * Math.PI * 2
      const height = (Math.random() - 0.5) * 9
      data[index * 3] = Math.cos(angle) * radius
      data[index * 3 + 1] = height
      data[index * 3 + 2] = Math.sin(angle) * radius - 6
    }

    return data
  }, [])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.rotation.y = t * 0.035
    ref.current.rotation.x = Math.sin(t * 0.12) * 0.025
    ref.current.position.z = (t * 0.55) % 2.2
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#dbeafe" size={0.018} transparent opacity={0.72} depthWrite={false} />
    </points>
  )
}
