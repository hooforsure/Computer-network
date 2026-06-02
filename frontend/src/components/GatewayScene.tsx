import { Float, Line, Text } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

interface GatewaySceneProps {
  focus: number
}

const portals = [
  { label: 'Protocol Lab', color: '#22d3ee', position: [1.2, 0.25, -1.2] as [number, number, number] },
  { label: 'Network Scenario', color: '#f59e0b', position: [4.2, -0.25, 0.3] as [number, number, number] },
  { label: 'Knowledge Atlas', color: '#34d399', position: [7.2, 0.28, -1.4] as [number, number, number] },
]

export function GatewayScene({ focus }: GatewaySceneProps) {
  return (
    <Canvas camera={{ position: [0, 1.6, 8], fov: 52 }} dpr={[1, 1.8]}>
      <color attach="background" args={['#05070d']} />
      <fog attach="fog" args={['#05070d', 9, 22]} />
      <ambientLight intensity={0.42} />
      <pointLight position={[0, 4, 5]} intensity={16} color="#22d3ee" />
      <pointLight position={[5, 2, -2]} intensity={10} color="#f59e0b" />
      <StarField />
      <PortalNetwork focus={focus} />
      <GatewayCamera focus={focus} />
    </Canvas>
  )
}

function PortalNetwork({ focus }: { focus: number }) {
  return (
    <group>
      <Line points={portals.map((portal) => portal.position)} color="#334155" lineWidth={1} transparent opacity={0.5} />
      {portals.map((portal, index) => (
        <GatewayPortal key={portal.label} portal={portal} active={index === focus} index={index} />
      ))}
    </group>
  )
}

function GatewayPortal({
  portal,
  active,
  index,
}: {
  portal: (typeof portals)[number]
  active: boolean
  index: number
}) {
  const mesh = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!mesh.current) return
    mesh.current.rotation.y = clock.elapsedTime * 0.45 + index
    mesh.current.rotation.z = clock.elapsedTime * 0.16
    mesh.current.scale.setScalar(active ? 1.22 : 1)
  })

  return (
    <Float speed={1.6} floatIntensity={0.38} floatingRange={[-0.12, 0.16]}>
      <group position={portal.position}>
        <mesh ref={mesh}>
          <torusKnotGeometry args={[0.55, 0.055, 120, 12]} />
          <meshStandardMaterial color={portal.color} emissive={portal.color} emissiveIntensity={active ? 2.2 : 0.9} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.75, 0.82, 96]} />
          <meshBasicMaterial color={portal.color} transparent opacity={active ? 0.58 : 0.23} />
        </mesh>
        <Text position={[0, -1.05, 0]} fontSize={0.24} color="#f8fafc" anchorX="center">
          {portal.label}
        </Text>
      </group>
    </Float>
  )
}

function GatewayCamera({ focus }: { focus: number }) {
  useFrame(({ camera }) => {
    const target = new THREE.Vector3(...portals[focus]?.position ?? [0, 0, 0])
    const desired = target.clone().add(new THREE.Vector3(-1.2, 1.55, 5.9))
    camera.position.lerp(desired, 0.018)
    camera.lookAt(target)
  })
  return null
}

function StarField() {
  const points = useMemo(() => {
    const positions = new Float32Array(360 * 3)
    for (let i = 0; i < 360; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 18
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14
    }
    return positions
  }, [])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#67e8f9" size={0.025} transparent opacity={0.72} />
    </points>
  )
}
