import { Line, OrbitControls, Text } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { SimulationStep, TopologyNode } from '../types/simulation'

interface NetworkSceneProps {
  nodes: TopologyNode[]
  step: SimulationStep
  orbit?: boolean
}

export function NetworkScene({ nodes, step, orbit = false }: NetworkSceneProps) {
  return (
    <Canvas camera={{ position: [0, 4.8, 8.6], fov: 46 }} dpr={[1, 1.8]} gl={{ antialias: true }}>
      <color attach="background" args={['#05070d']} />
      <fog attach="fog" args={['#05070d', 8, 22]} />
      <ambientLight intensity={0.45} />
      <pointLight position={[0, 5, 5]} intensity={18} color="#22d3ee" />
      <pointLight position={[6, 2, -3]} intensity={10} color="#8b5cf6" />
      <NetworkGrid />
      <Topology nodes={nodes} step={step} />
      <CameraRig nodes={nodes} step={step} />
      {orbit && <OrbitControls enablePan={false} maxDistance={14} minDistance={5} />}
    </Canvas>
  )
}

function Topology({ nodes, step }: { nodes: TopologyNode[]; step: SimulationStep }) {
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  const links = useMemo(() => collectLinks(nodes, step), [nodes, step])
  const packetPath = step.path.map((id) => byId.get(id)?.position).filter(Boolean) as Array<[number, number, number]>

  return (
    <group>
      {links.map(([from, to]) => {
        const start = byId.get(from)
        const end = byId.get(to)
        if (!start || !end) return null
        const active = step.highlightLinks?.some(([a, b]) => (a === from && b === to) || (a === to && b === from))
        return (
          <Line
            key={`${from}-${to}`}
            points={[start.position, end.position]}
            color={active ? '#22d3ee' : '#334155'}
            lineWidth={active ? 3 : 1}
            transparent
            opacity={active ? 0.95 : 0.46}
          />
        )
      })}
      {nodes.map((node) => (
        <NetworkNode key={node.id} node={node} active={step.highlightNodes?.includes(node.id) ?? false} />
      ))}
      {packetPath.length >= 2 && <Packet path={packetPath} color={packetColor(step.packetType)} label={step.packetType} />}
    </group>
  )
}

function NetworkNode({ node, active }: { node: TopologyNode; active: boolean }) {
  const mesh = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!mesh.current) return
    const pulse = active ? 1 + Math.sin(clock.elapsedTime * 4) * 0.08 : 1
    mesh.current.scale.setScalar(pulse)
  })

  return (
    <group position={node.position}>
      <mesh ref={mesh}>
        <boxGeometry args={[0.72, 0.72, 0.72]} />
        <meshStandardMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={active ? 1.9 : 0.42}
          roughness={0.24}
          metalness={0.35}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.44, 0]}>
        <ringGeometry args={[0.62, 0.68, 56]} />
        <meshBasicMaterial color={node.color} transparent opacity={active ? 0.7 : 0.22} />
      </mesh>
      <Text position={[0, 0.82, 0]} fontSize={0.22} color="#f8fafc" anchorX="center" anchorY="middle">
        {node.label}
      </Text>
      <Text position={[0, 0.54, 0]} fontSize={0.13} color="#94a3b8" anchorX="center" anchorY="middle">
        {node.role}
      </Text>
    </group>
  )
}

function Packet({ path, color, label }: { path: Array<[number, number, number]>; color: string; label: string }) {
  const group = useRef<THREE.Group>(null)
  const curve = useMemo(() => {
    const points = path.map((point) => new THREE.Vector3(...point))
    return new THREE.CatmullRomCurve3(points)
  }, [path])

  useFrame(({ clock }) => {
    if (!group.current) return
    const t = (clock.elapsedTime * 0.28) % 1
    const point = curve.getPointAt(t)
    group.current.position.copy(point)
  })

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[0.18, 32, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.8} />
      </mesh>
      <Text position={[0, 0.42, 0]} fontSize={0.16} color={color} anchorX="center" anchorY="middle">
        {label}
      </Text>
    </group>
  )
}

function CameraRig({ nodes, step }: { nodes: TopologyNode[]; step: SimulationStep }) {
  const target = useMemo(() => nodes.find((node) => node.id === step.cameraFocus), [nodes, step.cameraFocus])

  useFrame(({ camera }) => {
    if (!target) return
    const focus = new THREE.Vector3(...target.position)
    const desired = focus.clone().add(new THREE.Vector3(0, 3.4, 6.6))
    camera.position.lerp(desired, 0.025)
    camera.lookAt(focus)
  })

  return null
}

function NetworkGrid() {
  return (
    <group>
      <gridHelper args={[16, 22, '#155e75', '#172033']} position={[0, -0.9, 0]} />
      <mesh position={[0, -0.92, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[18, 18]} />
        <meshBasicMaterial color="#05070d" transparent opacity={0.18} />
      </mesh>
    </group>
  )
}

function collectLinks(nodes: TopologyNode[], step: SimulationStep): Array<[string, string]> {
  const links = new Set<string>()
  const add = (a: string, b: string) => links.add([a, b].sort().join('|'))
  for (let index = 0; index < nodes.length - 1; index += 1) {
    add(nodes[index].id, nodes[index + 1].id)
  }
  step.highlightLinks?.forEach(([a, b]) => add(a, b))
  for (let index = 0; index < step.path.length - 1; index += 1) {
    add(step.path[index], step.path[index + 1])
  }
  return Array.from(links).map((link) => link.split('|') as [string, string])
}

function packetColor(packetType: string) {
  if (packetType.includes('SYN') || packetType.includes('FIN') || packetType === 'ACK') return '#8b5cf6'
  if (packetType.includes('CACHE')) return '#34d399'
  if (packetType.includes('RESPONSE')) return '#67e8f9'
  return '#22d3ee'
}
