import { useGLTF, useTexture } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'

interface GatewaySceneProps {
  focus: number
  transitionBoost: number
}

const SHIP_SIZE =35
const SHIP_POSITION = new THREE.Vector3(2.8, -0.25, 1)
const SHIP_ROTATION = new THREE.Euler(0.6, -0.1, 0.24)
const STATION_EMISSIVE = new THREE.Color('#20101c')
const COMPANION_EMISSIVE = new THREE.Color('#08070d')

export function GatewayScene(_: GatewaySceneProps) {
  return (
    <Canvas camera={{ position: [0.25, 0.22, 5.2], fov: 54 }} dpr={[1, 1.7]} gl={{ antialias: true, alpha: false }}>
      <color attach="background" args={['#02040a']} />
      <fog attach="fog" args={['#090914', 12, 30]} />
      <ambientLight intensity={0.5} color="#9fcaff" />
      <hemisphereLight args={['#76c8ff', '#16070b', 0.46]} />
      <directionalLight position={[-5.2, 4.6, 4.9]} intensity={3.35} color="#bdefff" />
      <directionalLight position={[5.9, 0.25, -4.6]} intensity={2.9} color="#ff3f2f" />
      <pointLight position={[2.35, 1.35, 3.1]} intensity={6.4} color="#e9fbff" distance={9} decay={1.8} />
      <pointLight position={[-4.9, -1.65, -3.9]} intensity={4.8} color="#38dfff" distance={13} decay={2} />
      <pointLight position={[5.1, 2.4, -2.2]} intensity={4.2} color="#ff2d22" distance={12} decay={2} />
      <pointLight position={[0.4, -2.9, 1.8]} intensity={2.6} color="#136bff" distance={10} decay={2} />
      <MovingParticles />
      <Suspense fallback={null}>
        <NebulaBackdrop />
        <StationSpecularRig />
        <StationSubject />
        <CompanionTraffic />
      </Suspense>
    </Canvas>
  )
}

function StationSpecularRig() {
  const coldGlint = useRef<THREE.PointLight>(null)
  const redRim = useRef<THREE.PointLight>(null)
  const underGlow = useRef<THREE.PointLight>(null)
  const broadFill = useRef<THREE.PointLight>(null)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime*2
    if (coldGlint.current) {
      coldGlint.current.position.set(
        SHIP_POSITION.x - 1.2 + Math.sin(t * 0.65) * 1.2,
        SHIP_POSITION.y + 1.15 + Math.cos(t * 0.42) * 0.28,
        SHIP_POSITION.z + 2.15,
      )
      coldGlint.current.intensity = 5.2 + Math.sin(t * 1.35) * 1.2
    }

    if (redRim.current) {
      redRim.current.position.set(
        SHIP_POSITION.x + 3.35 + Math.sin(t * 0.32) * 0.55,
        SHIP_POSITION.y + 0.18 + Math.cos(t * 0.5) * 0.24,
        SHIP_POSITION.z - 1.25,
      )
      redRim.current.intensity = 4.8 + Math.cos(t * 1.1) * 0.9
    }

    if (underGlow.current) {
      underGlow.current.position.set(
        SHIP_POSITION.x + 0.2 + Math.cos(t * 0.38) * 0.8,
        SHIP_POSITION.y - 1.25,
        SHIP_POSITION.z + 1.45 + Math.sin(t * 0.46) * 0.35,
      )
    }

    if (broadFill.current) {
      broadFill.current.position.set(
        SHIP_POSITION.x - 0.8 + Math.sin(t * 0.28) * 0.65,
        SHIP_POSITION.y + 0.1,
        SHIP_POSITION.z + 3.2,
      )
      broadFill.current.intensity = 4.6 + Math.sin(t * 0.72) * 0.5
    }
  })

  return (
    <>
      <pointLight ref={coldGlint} color="#f2fdff" intensity={5.2} distance={28} decay={1.05} />
      <pointLight ref={redRim} color="#ff3128" intensity={4.8} distance={24} decay={1.18} />
      <pointLight ref={underGlow} color="#36d9ff" intensity={3.2} distance={22} decay={1.22} />
      <pointLight ref={broadFill} color="#a7efff" intensity={4.6} distance={34} decay={1.35} />
    </>
  )
}

function NebulaBackdrop() {
  const texture = useTexture('/textures/nebula-skydome.png')
  const material = useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.repeat.set(1, 1)
    texture.offset.set(0.08, 0)
    texture.needsUpdate = true

    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        brightness: { value: 1.92 },
        baseColor: { value: new THREE.Color('#02040a') },
        cyanTint: { value: new THREE.Color('#68ddff') },
        redTint: { value: new THREE.Color('#ff3b2e') },
        deepTint: { value: new THREE.Color('#070916') },
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform float brightness;
        uniform vec3 baseColor;
        uniform vec3 cyanTint;
        uniform vec3 redTint;
        uniform vec3 deepTint;
        varying vec2 vUv;

        void main() {
          vec2 uv = vUv;
          vec3 nebula = texture2D(map, uv).rgb;
          float energy = max(max(nebula.r, nebula.g), nebula.b);
          float cyan = smoothstep(0.08, 0.78, nebula.b + nebula.g * 0.55);
          float red = smoothstep(0.09, 0.7, nebula.r * 1.35 - nebula.b * 0.18);
          float vignette = smoothstep(0.9, 0.18, distance(uv, vec2(0.52, 0.48)));

          vec3 graded = deepTint + cyanTint * cyan * 0.64 + redTint * red * 0.48;
          graded += pow(nebula, vec3(0.72)) * brightness * vec3(0.8, 0.95, 1.08);
          graded *= 0.62 + vignette * 0.55;

          vec3 color = mix(baseColor, graded, smoothstep(0.015, 0.9, energy));
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
      transparent: false,
    })
  }, [texture])

  const ref = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = -0.64 + clock.elapsedTime * 0.002
    ref.current.rotation.x = -0.08 + Math.sin(clock.elapsedTime * 0.05) * 0.01
  })

  return (
    <mesh ref={ref} renderOrder={-1000}>
      <sphereGeometry args={[120, 96, 48]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

function useNormalizedModel(url: string, targetSize: number) {
  const gltf = useGLTF(url)

  return useMemo(() => {
    const scene = gltf.scene.clone(true)
    const box = new THREE.Box3().setFromObject(scene)
    const center = new THREE.Vector3()
    const size = new THREE.Vector3()
    box.getCenter(center)
    box.getSize(size)

    const maxDim = Math.max(size.x, size.y, size.z) || 1
    const scale = targetSize / maxDim

    scene.position.set(-center.x * scale, -center.y * scale, -center.z * scale)
    scene.scale.setScalar(scale)
    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      const material = child.material
      if (material instanceof THREE.MeshStandardMaterial) {
        material.color.lerp(new THREE.Color('#03040a'), 0.42)
        material.metalness = Math.min(material.metalness, 0.34)
        material.roughness = Math.max(Math.min(material.roughness, 0.82), 0.6)
        material.envMapIntensity = 0.42
        material.emissive = COMPANION_EMISSIVE
        material.emissiveIntensity = 0.025
        material.needsUpdate = true
      }
    })

    return scene
  }, [gltf.scene, targetSize])
}

function createGlossyStationMaterial(source: THREE.Material): THREE.Material {
  if (source instanceof THREE.MeshStandardMaterial) {
    const material = new THREE.MeshPhysicalMaterial({
      name: source.name,
      color: source.color.clone().lerp(new THREE.Color('#ffffff'), 0.12),
      map: source.map,
      normalMap: source.normalMap,
      roughnessMap: source.roughnessMap,
      metalnessMap: source.metalnessMap,
      aoMap: source.aoMap,
      emissiveMap: source.emissiveMap,
      alphaMap: source.alphaMap,
      transparent: source.transparent,
      opacity: source.opacity,
      side: source.side,
      metalness: Math.max(source.metalness, 0.82),
      roughness: Math.min(source.roughness, 0.16),
      envMapIntensity: 2.55,
      emissive: STATION_EMISSIVE,
      emissiveIntensity: Math.max(source.emissiveIntensity, 0.22),
      clearcoat: 0.82,
      clearcoatRoughness: 0.12,
    })

    if (source.normalScale) {
      material.normalScale.copy(source.normalScale)
    }

    material.needsUpdate = true
    return material
  }

  const material = source.clone()
  if (material instanceof THREE.MeshBasicMaterial || material instanceof THREE.MeshLambertMaterial || material instanceof THREE.MeshPhongMaterial) {
    material.color.lerp(new THREE.Color('#dff8ff'), 0.2)
    material.needsUpdate = true
  }

  return material
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
      copied.material = Array.isArray(mesh.material) ? mesh.material.map(createGlossyStationMaterial) : createGlossyStationMaterial(mesh.material)
      copied.applyMatrix4(mesh.matrixWorld)

      const materials = Array.isArray(copied.material) ? copied.material : [copied.material]
      materials.forEach((material) => {
        if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
          material.metalness = Math.max(material.metalness, 0.82)
          material.roughness = Math.min(material.roughness, 0.16)
          material.envMapIntensity = Math.max(material.envMapIntensity, 2.55)
          material.emissive = STATION_EMISSIVE
          material.emissiveIntensity = Math.max(material.emissiveIntensity, 0.22)
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
    ref.current.rotation.set(SHIP_ROTATION.x, SHIP_ROTATION.y + t * 0.2, SHIP_ROTATION.z)
  })

  return (
    <group ref={ref}>
      <primitive object={upperShip} />
    </group>
  )
}

function CompanionTraffic() {
  return (
    <group>
      <OrbitingSatellites />
      <PatrolShips />
      <AsteroidPasses />
    </group>
  )
}

function OrbitingSatellites() {
  const satellite = useNormalizedModel('/models/satellite.glb', 0.46)
  const satA = useMemo(() => satellite.clone(true), [satellite])
  const satB = useMemo(() => satellite.clone(true), [satellite])
  const satC = useMemo(() => satellite.clone(true), [satellite])

  return (
    <group>
      <OrbitingObject object={satA} radiusX={4.55} radiusY={1.62} radiusZ={2.15} speed={0.18} phase={0.45} scale={1} tilt={0.18} />
      <OrbitingObject object={satB} radiusX={5.65} radiusY={-1.75} radiusZ={2.75} speed={-0.145} phase={2.75} scale={0.76} tilt={-0.24} />
      <OrbitingObject object={satC} radiusX={6.15} radiusY={0.62} radiusZ={3.25} speed={0.105} phase={4.25} scale={0.64} tilt={0.42} />
    </group>
  )
}

function OrbitingObject({
  object,
  radiusX,
  radiusY,
  radiusZ,
  speed,
  phase,
  scale,
  tilt,
}: {
  object: THREE.Object3D
  radiusX: number
  radiusY: number
  radiusZ: number
  speed: number
  phase: number
  scale: number
  tilt: number
}) {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime * speed + phase
    ref.current.position.set(
      SHIP_POSITION.x + Math.cos(t) * radiusX,
      SHIP_POSITION.y + radiusY + Math.sin(t * 1.12 + tilt) * 0.28,
      SHIP_POSITION.z - 0.55 + Math.sin(t + tilt) * radiusZ,
    )
    ref.current.rotation.set(Math.sin(t) * 0.32 + tilt, t * 1.55, Math.cos(t) * 0.22)
    ref.current.scale.setScalar(scale)
  })

  return (
    <group ref={ref}>
      <primitive object={object} />
    </group>
  )
}

function PatrolShips() {
  const ship = useNormalizedModel('/models/hero_ship.glb', 0.72)
  const shipA = useMemo(() => ship.clone(true), [ship])
  const shipB = useMemo(() => ship.clone(true), [ship])
  const shipC = useMemo(() => ship.clone(true), [ship])

  return (
    <group>
      <PatrolShip object={shipA} lane={0} />
      <PatrolShip object={shipB} lane={1} />
      <PatrolShip object={shipC} lane={2} />
    </group>
  )
}

function PatrolShip({ object, lane }: { object: THREE.Object3D; lane: number }) {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = (clock.elapsedTime * (0.07 + lane * 0.018) + lane * 0.32) % 1
    const wave = t * Math.PI * 2
    const lanes = [
      { from: 6.4, to: -3.8, y: 2.55, z: -2.15, bank: 0.12, yaw: -1.36 },
      { from: -5.4, to: 5.8, y: -2.55, z: -2.95, bank: -0.26, yaw: 1.72 },
      { from: 5.8, to: -4.9, y: 0.95, z: -4.05, bank: 0.34, yaw: -1.18 },
    ]
    const path = lanes[lane] ?? lanes[0]
    const x = THREE.MathUtils.lerp(path.from, path.to, t)
    const y = path.y + Math.sin(wave) * 0.36
    const z = path.z + Math.cos(wave * 0.5) * 0.45

    ref.current.position.set(SHIP_POSITION.x + x, SHIP_POSITION.y + y, SHIP_POSITION.z + z)
    ref.current.rotation.set(path.bank + Math.sin(wave) * 0.08, path.yaw + (t - 0.5) * 0.34, path.bank)
  })

  return (
    <group ref={ref}>
      <primitive object={object} />
    </group>
  )
}

function AsteroidPasses() {
  const asteroid = useNormalizedModel('/models/asteroid_01.glb', 0.62)
  const pack = useNormalizedModel('/models/asteroids_pack.glb', 0.52)
  const rocks = useMemo(
    () => [
      { object: asteroid.clone(true), phase: 0, y: 2.95, z: -3.55, from: 7.8, to: -5.4, speed: 0.068, scale: 1 },
      { object: pack.clone(true), phase: 0.34, y: -3.15, z: -4.25, from: -6.4, to: 7.1, speed: 0.054, scale: 0.78 },
      { object: asteroid.clone(true), phase: 0.68, y: 0.05, z: -5.35, from: 8.4, to: -7.2, speed: 0.046, scale: 0.66 },
      { object: pack.clone(true), phase: 0.82, y: 1.18, z: -6.2, from: -7.6, to: 6.6, speed: 0.041, scale: 0.54 },
    ],
    [asteroid, pack],
  )

  return (
    <group>
      {rocks.map((rock, index) => (
        <AsteroidPass key={index} {...rock} index={index} />
      ))}
    </group>
  )
}

function AsteroidPass({
  object,
  phase,
  y,
  z,
  from,
  to,
  speed,
  scale,
  index,
}: {
  object: THREE.Object3D
  phase: number
  y: number
  z: number
  from: number
  to: number
  speed: number
  scale: number
  index: number
}) {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = (clock.elapsedTime * speed + phase) % 1
    ref.current.position.set(
      SHIP_POSITION.x + THREE.MathUtils.lerp(from, to, t),
      SHIP_POSITION.y + y + Math.sin(clock.elapsedTime * 0.45 + index) * 0.25,
      SHIP_POSITION.z + z + Math.sin(t * Math.PI) * 0.75,
    )
    ref.current.rotation.x = clock.elapsedTime * (0.32 + index * 0.08)
    ref.current.rotation.y = clock.elapsedTime * (0.24 + index * 0.06)
    ref.current.rotation.z = clock.elapsedTime * (0.18 + index * 0.05)
    ref.current.scale.setScalar(scale)
  })

  return (
    <group ref={ref}>
      <primitive object={object} />
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
