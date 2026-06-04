import { Float, Line, Text } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

interface GatewaySceneProps {
  focus: number
  scrollProgress: number
  transitionBoost: number
}

const portals = [
  { label: 'Protocol Lab', color: '#22d3ee', position: [2.55, 0.25, -1.2] as [number, number, number] },
  { label: 'Network Scenario', color: '#f59e0b', position: [5.35, -0.25, 0.3] as [number, number, number] },
  { label: 'Knowledge Atlas', color: '#34d399', position: [8.35, 0.28, -1.4] as [number, number, number] },
]

function portalPosition(portal: (typeof portals)[number], scrollProgress: number): [number, number, number] {
  return [
    portal.position[0] + scrollProgress * 1.25,
    portal.position[1] - scrollProgress * 1.35,
    portal.position[2] - scrollProgress * 2.8,
  ]
}

export function GatewayScene({ focus, scrollProgress, transitionBoost }: GatewaySceneProps) {
  return (
    <Canvas camera={{ position: [0, 1.6, 8], fov: 52 }} dpr={[1, 1.8]}>
      <color attach="background" args={['#05070d']} />
      <fog attach="fog" args={['#05070d', 10, 24]} />
      <ambientLight intensity={0.42} />
      <pointLight position={[0, 4, 5]} intensity={16} color="#22d3ee" />
      <pointLight position={[5, 2, -2]} intensity={10} color="#f59e0b" />
      <pointLight position={[-4, -1, 4]} intensity={9} color="#34d399" />
      <StarField scrollProgress={scrollProgress} />
      <EnergyTunnel scrollProgress={scrollProgress} transitionBoost={transitionBoost} />
      <DataStreams scrollProgress={scrollProgress} focus={focus} />
      <PortalNetwork focus={focus} scrollProgress={scrollProgress} transitionBoost={transitionBoost} />
      <GatewayCamera focus={focus} scrollProgress={scrollProgress} transitionBoost={transitionBoost} />
    </Canvas>
  )
}

function PortalNetwork({
  focus,
  scrollProgress,
  transitionBoost,
}: {
  focus: number
  scrollProgress: number
  transitionBoost: number
}) {
  return (
    <group>
      <Line
        points={portals.map((portal) => portalPosition(portal, scrollProgress))}
        color="#334155"
        lineWidth={1.2}
        transparent
        opacity={0.5 - Math.min(scrollProgress, 0.8) * 0.2}
      />
      {portals.map((portal, index) => (
        <GatewayPortal
          key={portal.label}
          portal={portal}
          active={index === focus}
          index={index}
          scrollProgress={scrollProgress}
          transitionBoost={transitionBoost}
        />
      ))}
    </group>
  )
}

function GatewayPortal({
  portal,
  active,
  index,
  scrollProgress,
  transitionBoost,
}: {
  portal: (typeof portals)[number]
  active: boolean
  index: number
  scrollProgress: number
  transitionBoost: number
}) {
  const mesh = useRef<THREE.Mesh>(null)
  const halo = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!mesh.current) return
    const speed = 0.45 + scrollProgress * 0.42 + transitionBoost * 1.6
    mesh.current.rotation.y = clock.elapsedTime * speed + index
    mesh.current.rotation.z = clock.elapsedTime * (0.16 + scrollProgress * 0.18)
    mesh.current.scale.setScalar((active ? 1.22 : 1) + transitionBoost * (active ? 0.8 : 0.18))
    if (halo.current) {
      halo.current.rotation.z = -clock.elapsedTime * (0.28 + scrollProgress * 0.4)
      halo.current.scale.setScalar((active ? 1.05 : 0.92) + Math.sin(clock.elapsedTime * 2.6) * 0.04)
    }
  })

  return (
    <Float speed={1.6} floatIntensity={0.38} floatingRange={[-0.12, 0.16]}>
      <group position={portalPosition(portal, scrollProgress)} scale={1 - Math.min(scrollProgress, 0.85) * 0.32}>
        <mesh ref={mesh}>
          <torusKnotGeometry args={[0.55, 0.055, 120, 12]} />
          <meshStandardMaterial
            color={portal.color}
            emissive={portal.color}
            emissiveIntensity={active ? 1.95 : 0.72}
            transparent
            opacity={0.92 - Math.min(scrollProgress, 0.85) * 0.16}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.75, 0.82, 96]} />
          <meshBasicMaterial color={portal.color} transparent opacity={(active ? 0.52 : 0.2) - Math.min(scrollProgress, 0.8) * 0.08} />
        </mesh>
        <mesh ref={halo} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.04, 0.012, 8, 96]} />
          <meshBasicMaterial color={portal.color} transparent opacity={(active ? 0.62 : 0.26) - Math.min(scrollProgress, 0.8) * 0.1} />
        </mesh>
        <Text position={[0, -1.05, 0]} fontSize={0.24} color="#f8fafc" anchorX="center">
          {portal.label}
        </Text>
      </group>
    </Float>
  )
}

function GatewayCamera({
  focus,
  scrollProgress,
  transitionBoost,
}: {
  focus: number
  scrollProgress: number
  transitionBoost: number
}) {
  useFrame(({ camera }) => {
    const target = new THREE.Vector3(...portalPosition(portals[focus], scrollProgress))
    const cinematicDrift = new THREE.Vector3(
      -1.05 + Math.sin(scrollProgress * Math.PI * 1.5) * 0.45,
      1.65 - scrollProgress * 0.55,
      6.4 - scrollProgress * 3.6 - transitionBoost * 3.4,
    )
    const desired = target.clone().add(cinematicDrift)
    camera.position.lerp(desired, 0.032 + transitionBoost * 0.08)
    if ('fov' in camera) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, 52 - scrollProgress * 6 - transitionBoost * 10, 0.04)
      camera.updateProjectionMatrix()
    }
    camera.lookAt(target)
  })
  return null
}

function StarField({ scrollProgress }: { scrollProgress: number }) {
  const ref = useRef<THREE.Points>(null)
  const points = useMemo(() => {
    const positions = new Float32Array(720 * 3)
    for (let i = 0; i < 720; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 24
      positions[i * 3 + 1] = (Math.random() - 0.5) * 13
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20
    }
    return positions
  }, [])

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = clock.elapsedTime * 0.015 + scrollProgress * 0.28
    ref.current.position.z = scrollProgress * 1.5
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#67e8f9" size={0.027} transparent opacity={0.78} />
    </points>
  )
}

function EnergyTunnel({
  scrollProgress,
  transitionBoost,
}: {
  scrollProgress: number
  transitionBoost: number
}) {
  const group = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!group.current) return
    group.current.rotation.z = clock.elapsedTime * (0.08 + scrollProgress * 0.16)
    group.current.position.z = -scrollProgress * 3.2
  })

  return (
    <group ref={group} position={[3.9, 0, -2.8]} rotation={[0.2, -0.34, 0]}>
      {Array.from({ length: 9 }).map((_, index) => {
        const radius = 1.35 + index * 0.38
        const opacity = 0.06 + index * 0.018 + transitionBoost * 0.12
        const color = index % 3 === 0 ? '#22d3ee' : index % 3 === 1 ? '#f59e0b' : '#34d399'
        return (
          <mesh key={index} position={[0, 0, -index * 0.46]} rotation={[Math.PI / 2, 0, index * 0.26]}>
            <torusGeometry args={[radius, 0.01 + transitionBoost * 0.018, 6, 128]} />
            <meshBasicMaterial color={color} transparent opacity={opacity} />
          </mesh>
        )
      })}
    </group>
  )
}

function DataStreams({ scrollProgress, focus }: { scrollProgress: number; focus: number }) {
  const streams = useMemo(
    () => [
      { y: 1.4, z: -1.2, color: '#22d3ee', offset: 0 },
      { y: -0.8, z: 0.4, color: '#f59e0b', offset: 0.32 },
      { y: 0.2, z: -2.3, color: '#34d399', offset: 0.64 },
    ],
    [],
  )

  return (
    <group>
      {streams.map((stream, index) => (
        <StreamLine key={index} {...stream} scrollProgress={scrollProgress} focus={focus} />
      ))}
    </group>
  )
}

function StreamLine({
  y,
  z,
  color,
  offset,
  scrollProgress,
  focus,
}: {
  y: number
  z: number
  color: string
  offset: number
  scrollProgress: number
  focus: number
}) {
  const packet = useRef<THREE.Mesh>(null)
  const points = useMemo(
    () => [
      new THREE.Vector3(-4.8, y, z),
      new THREE.Vector3(-1.2, y + 0.35, z - 0.4),
      new THREE.Vector3(2.3 + focus * 0.8, y - 0.2, z + 0.2),
      new THREE.Vector3(8.4, y + 0.1, z - 0.5),
    ],
    [focus, y, z],
  )
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points), [points])

  useFrame(({ clock }) => {
    if (!packet.current) return
    const t = (clock.elapsedTime * (0.08 + scrollProgress * 0.28) + offset) % 1
    packet.current.position.copy(curve.getPointAt(t))
  })

  return (
    <group>
      <Line points={points.map((point) => point.toArray() as [number, number, number])} color={color} lineWidth={1.5} transparent opacity={0.22 + scrollProgress * 0.28} />
      <mesh ref={packet}>
        <sphereGeometry args={[0.075 + scrollProgress * 0.045, 18, 18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.7} />
      </mesh>
    </group>
  )
}
