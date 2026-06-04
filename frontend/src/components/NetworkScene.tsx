import { Line, OrbitControls, Text } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { SimulationStep, TopologyNode } from '../types/simulation'

interface NetworkSceneProps {
  nodes: TopologyNode[]
  step: SimulationStep
  focusNonce?: number
  onNodeSelect?: (node: TopologyNode) => void
  onPacketSelect?: (step: SimulationStep) => void
  selectedNodeId?: string | null
}

export function NetworkScene({
  nodes,
  step,
  focusNonce = 0,
  onNodeSelect,
  onPacketSelect,
  selectedNodeId,
}: NetworkSceneProps) {
  return (
    <Canvas className="absolute inset-0 h-full w-full" camera={{ position: [-0.9, 5.25, 9.6], fov: 46 }} dpr={[1, 1.8]} gl={{ antialias: true }}>
      <color attach="background" args={['#05070d']} />
      <fog attach="fog" args={['#05070d', 13, 32]} />
      <ambientLight intensity={0.45} />
      <pointLight position={[0, 5, 5]} intensity={18} color="#22d3ee" />
      <pointLight position={[6, 2, -3]} intensity={10} color="#8b5cf6" />
      <NetworkGrid />
      <Suspense fallback={<TopologyFallback nodes={nodes} step={step} />}>
        <Topology
          nodes={nodes}
          step={step}
          selectedNodeId={selectedNodeId}
          onNodeSelect={onNodeSelect}
          onPacketSelect={onPacketSelect}
        />
      </Suspense>
      <CameraRig nodes={nodes} step={step} focusNonce={focusNonce} />
      <OrbitControls makeDefault enablePan maxDistance={18} minDistance={4.8} />
    </Canvas>
  )
}

function TopologyFallback({ nodes, step }: { nodes: TopologyNode[]; step: SimulationStep }) {
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  const links = useMemo(() => collectLinks(step), [step])
  const localScanNodes = step.visualMode === 'local-scan'
    ? (['client', 'cache', 'localDns'].map((id) => byId.get(id)).filter(Boolean) as TopologyNode[])
    : []

  return (
    <group>
      {links.map(([from, to]) => {
        const start = byId.get(from)
        const end = byId.get(to)
        if (!start || !end) return null
        return (
          <Line
            key={`${from}-${to}-fallback`}
            points={[start.position, end.position]}
            color="#164e63"
            lineWidth={1}
            transparent
            opacity={0.52}
          />
        )
      })}
      {nodes.map((node) => (
        <group key={`${node.id}-fallback`} position={node.position}>
          <NodeModel node={node} active={step.highlightNodes?.includes(node.id) ?? false} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.44, 0]}>
            <ringGeometry args={[0.62, 0.68, 56]} />
            <meshBasicMaterial color={node.color} transparent opacity={0.28} />
          </mesh>
        </group>
      ))}
      {step.visualMode === 'local-scan' && localScanNodes.length > 0 && (
        <LocalScan nodes={localScanNodes} hit={step.packetType === 'CACHE_HIT'} compact />
      )}
    </group>
  )
}

function Topology({
  nodes,
  step,
  selectedNodeId,
  onNodeSelect,
  onPacketSelect,
}: {
  nodes: TopologyNode[]
  step: SimulationStep
  selectedNodeId?: string | null
  onNodeSelect?: (node: TopologyNode) => void
  onPacketSelect?: (step: SimulationStep) => void
}) {
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  const links = useMemo(() => collectLinks(step), [step])
  const packetPath = step.path.map((id) => byId.get(id)?.position).filter(Boolean) as Array<[number, number, number]>
  const localScanNodes = step.visualMode === 'local-scan'
    ? (['client', 'cache', 'localDns'].map((id) => byId.get(id)).filter(Boolean) as TopologyNode[])
    : []

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
            color={active ? activeLinkColor(step) : '#334155'}
            lineWidth={active ? 3 : 1}
            transparent
            opacity={active ? 0.95 : 0.46}
          />
        )
      })}
      {nodes.map((node) => (
        <NetworkNode
          key={node.id}
          node={node}
          active={step.highlightNodes?.includes(node.id) ?? false}
          selected={selectedNodeId === node.id}
          onSelect={onNodeSelect}
        />
      ))}
      {step.visualMode === 'local-scan' && localScanNodes.length > 0 && (
        <LocalScan nodes={localScanNodes} hit={step.packetType === 'CACHE_HIT'} />
      )}
      {step.visualMode !== 'local-scan' && packetPath.length >= 2 && (
        <Packet
          path={packetPath}
          color={packetColor(step)}
          label={packetLabel(step)}
          direction={step.direction}
          onSelect={() => onPacketSelect?.(step)}
        />
      )}
    </group>
  )
}

function NetworkNode({
  node,
  active,
  selected,
  onSelect,
}: {
  node: TopologyNode
  active: boolean
  selected: boolean
  onSelect?: (node: TopologyNode) => void
}) {
  const group = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!group.current) return
    const pulse = active ? 1 + Math.sin(clock.elapsedTime * 4) * 0.08 : 1
    group.current.scale.setScalar(pulse)
  })

  return (
    <group
      position={node.position}
      onClick={(event) => {
        event.stopPropagation()
        onSelect?.(node)
      }}
    >
      <group ref={group}>
        <NodeModel node={node} active={active} />
      </group>
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
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.39, 0]}>
          <ringGeometry args={[0.86, 0.93, 72]} />
          <meshBasicMaterial color="#f8fafc" transparent opacity={0.72} />
        </mesh>
      )}
    </group>
  )
}

function NodeModel({ node, active }: { node: TopologyNode; active: boolean }) {
  const material = (
    <meshStandardMaterial
      color={node.color}
      emissive={node.color}
      emissiveIntensity={active ? 1.75 : 0.42}
      roughness={0.28}
      metalness={0.38}
    />
  )

  if (node.kind === 'client' || node.kind === 'host') {
    return (
      <group>
        <mesh position={[0, 0.05, 0]} rotation={[0.04, -0.18, 0]}>
          <boxGeometry args={[0.92, 0.58, 0.08]} />
          {material}
        </mesh>
        <mesh position={[0, -0.36, 0]}>
          <boxGeometry args={[0.42, 0.12, 0.16]} />
          {material}
        </mesh>
        <mesh position={[0, -0.52, 0]}>
          <boxGeometry args={[0.72, 0.08, 0.22]} />
          {material}
        </mesh>
      </group>
    )
  }

  if (node.kind === 'cache') {
    return (
      <group>
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 0.66, 42]} />
          {material}
        </mesh>
        <mesh position={[0, 0.45, 0]}>
          <torusGeometry args={[0.42, 0.022, 8, 42]} />
          <meshBasicMaterial color={node.color} transparent opacity={0.8} />
        </mesh>
      </group>
    )
  }

  if (node.kind === 'web-server' || node.kind === 'server') {
    return (
      <group>
        <mesh position={[0, 0.08, 0]}>
          <boxGeometry args={[0.62, 0.9, 0.42]} />
          {material}
        </mesh>
        {[0.24, 0.02, -0.2].map((y) => (
          <mesh key={y} position={[0, y, 0.225]}>
            <boxGeometry args={[0.42, 0.045, 0.018]} />
            <meshBasicMaterial color="#f8fafc" transparent opacity={active ? 0.9 : 0.5} />
          </mesh>
        ))}
      </group>
    )
  }

  if (node.kind === 'switch') {
    return (
      <group>
        <mesh position={[0, -0.02, 0]}>
          <boxGeometry args={[0.95, 0.24, 0.58]} />
          {material}
        </mesh>
        {[-0.32, -0.1, 0.12, 0.34].map((x) => (
          <mesh key={x} position={[x, 0.14, 0.31]}>
            <boxGeometry args={[0.11, 0.06, 0.035]} />
            <meshBasicMaterial color="#bbf7d0" transparent opacity={active ? 0.95 : 0.48} />
          </mesh>
        ))}
      </group>
    )
  }

  if (node.kind === 'router') {
    return (
      <group>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <octahedronGeometry args={[0.48, 0]} />
          {material}
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.62, 0.018, 8, 56]} />
          <meshBasicMaterial color="#fde68a" transparent opacity={active ? 0.9 : 0.4} />
        </mesh>
      </group>
    )
  }

  if (node.kind === 'network' || node.kind === 'cloud') {
    return (
      <group>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.52, 0.045, 10, 64]} />
          {material}
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <torusGeometry args={[0.34, 0.025, 8, 48]} />
          <meshBasicMaterial color="#bbf7d0" transparent opacity={active ? 0.9 : 0.52} />
        </mesh>
        {[-0.28, 0, 0.28].map((x) => (
          <mesh key={x} position={[x, -0.34, 0]}>
            <boxGeometry args={[0.18, 0.16, 0.24]} />
            {material}
          </mesh>
        ))}
      </group>
    )
  }

  if (node.kind?.startsWith('dns') || node.kind === 'resolver') {
    const height = node.kind === 'resolver' ? 0.78 : 0.92
    return (
      <group>
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.34, 0.44, height, 6]} />
          {material}
        </mesh>
        <mesh position={[0, height / 2 + 0.12, 0]}>
          <octahedronGeometry args={[0.28, 0]} />
          {material}
        </mesh>
      </group>
    )
  }

  return (
    <mesh>
      <boxGeometry args={[0.72, 0.72, 0.72]} />
      {material}
    </mesh>
  )
}

function Packet({
  path,
  color,
  label,
  direction,
  onSelect,
}: {
  path: Array<[number, number, number]>
  color: string
  label: string
  direction?: SimulationStep['direction']
  onSelect?: () => void
}) {
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
    <group
      ref={group}
      onClick={(event) => {
        event.stopPropagation()
        onSelect?.()
      }}
    >
      <mesh>
        <sphereGeometry args={[direction === 'response' ? 0.2 : 0.18, 32, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.8} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.28, 0.012, 8, 42]} />
        <meshBasicMaterial color={color} transparent opacity={direction === 'response' ? 0.82 : 0.48} />
      </mesh>
      <Text position={[0, 0.42, 0]} fontSize={0.16} color={color} anchorX="center" anchorY="middle">
        {label}
      </Text>
    </group>
  )
}

function LocalScan({ nodes, hit, compact = false }: { nodes: TopologyNode[]; hit: boolean; compact?: boolean }) {
  const group = useRef<THREE.Group>(null)
  const points = useMemo(() => nodes.map((node) => node.position), [nodes])
  const color = hit ? '#34d399' : '#f59e0b'

  useFrame(({ clock }) => {
    if (!group.current) return
    const pulse = 1 + Math.sin(clock.elapsedTime * 5.5) * 0.16
    group.current.scale.setScalar(pulse)
    group.current.rotation.y = clock.elapsedTime * 0.75
  })

  return (
    <group>
      {points.map((point, index) => (
        <group key={`${point.join('-')}-${index}`} position={point}>
          <group ref={index === 1 ? group : undefined}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.18, 0]}>
              <ringGeometry args={[0.82, 0.88, 64]} />
              <meshBasicMaterial color={color} transparent opacity={index === 1 ? 0.9 : 0.38} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.16, 0]}>
              <ringGeometry args={[0.34, 0.37, 64]} />
              <meshBasicMaterial color="#67e8f9" transparent opacity={0.46} />
            </mesh>
          </group>
        </group>
      ))}
      {points.length >= 2 && (
        <Line
          points={points}
          color={color}
          lineWidth={3}
          transparent
          opacity={0.88}
        />
      )}
      {!compact && (
        <Text position={[-3.25, 1.28, -0.6]} fontSize={0.18} color={color} anchorX="center" anchorY="middle">
          {hit ? 'CACHE HIT' : 'CACHE MISS'}
        </Text>
      )}
    </group>
  )
}

function CameraRig({ nodes, step, focusNonce }: { nodes: TopologyNode[]; step: SimulationStep; focusNonce: number }) {
  const target = useMemo(() => nodes.find((node) => node.id === step.cameraFocus), [nodes, step.cameraFocus])
  const lastFocusNonce = useRef(focusNonce)
  const focusUntil = useRef(0)

  if (lastFocusNonce.current !== focusNonce) {
    lastFocusNonce.current = focusNonce
    focusUntil.current = performance.now() + 1200
  }

  useFrame(({ camera }) => {
    if (performance.now() > focusUntil.current) return
    if (step.visualMode === 'local-scan') {
      const focus = new THREE.Vector3(-2.95, 0.05, -0.18)
      const desired = new THREE.Vector3(-3.0, 4.15, 8.4)
      camera.position.lerp(desired, 0.028)
      camera.lookAt(focus)
      return
    }
    if (!target) return
    const targetFocus = new THREE.Vector3(...target.position)
    const overviewCenter = new THREE.Vector3(-1.25, 0, -0.55)
    const focus = targetFocus.lerp(overviewCenter, 0.68)
    const desired = focus.clone().add(new THREE.Vector3(-0.35, 4.85, 9.2))
    camera.position.lerp(desired, 0.018)
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

function collectLinks(step: SimulationStep): Array<[string, string]> {
  const links = new Set<string>()
  const add = (a: string, b: string) => links.add([a, b].sort().join('|'))
  step.highlightLinks?.forEach(([a, b]) => add(a, b))
  for (let index = 0; index < step.path.length - 1; index += 1) {
    add(step.path[index], step.path[index + 1])
  }
  return Array.from(links).map((link) => link.split('|') as [string, string])
}

function packetColor(step: SimulationStep) {
  if (step.packetType.includes('SYN') || step.packetType.includes('FIN') || step.packetType === 'ACK') return '#8b5cf6'
  if (step.packetType.includes('CACHE')) return '#34d399'
  if (step.packetType.includes('REFERRAL')) return '#f59e0b'
  if (step.packetType.includes('RESPONSE')) return '#67e8f9'
  if (step.packetType.includes('CONNECT')) return '#34d399'
  return '#22d3ee'
}

function activeLinkColor(step: SimulationStep) {
  if (step.direction === 'connect') return '#34d399'
  if (step.direction === 'response') return '#f59e0b'
  return '#22d3ee'
}

function packetLabel(step: SimulationStep) {
  if (step.direction === 'response') return `${step.packetType} RETURN`
  if (step.direction === 'request') return `${step.packetType} ASK`
  return step.packetType
}
