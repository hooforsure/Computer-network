import { Billboard, Html, Line, OrbitControls, Text } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { SimulationStep, TopologyNode } from '../types/simulation'

const SCENE_OFFSET = new THREE.Vector3(-1.72, -0.82, 0)

interface NetworkSceneProps {
  nodes: TopologyNode[]
  step: SimulationStep
  focusNonce?: number
  sceneOffset?: [number, number, number]
  nodeLabelOffset?: number
  htmlNodeLabels?: boolean
  onNodeSelect?: (node: TopologyNode) => void
  onPacketSelect?: (step: SimulationStep) => void
  selectedNodeId?: string | null
}

export function NetworkScene({
  nodes,
  step,
  focusNonce = 0,
  sceneOffset: sceneOffsetInput,
  nodeLabelOffset = 1.08,
  htmlNodeLabels = false,
  onNodeSelect,
  onPacketSelect,
  selectedNodeId,
}: NetworkSceneProps) {
  const sceneOffset = useMemo(
    () => (sceneOffsetInput ? new THREE.Vector3(...sceneOffsetInput) : SCENE_OFFSET),
    [sceneOffsetInput],
  )

  return (
    <Canvas className="absolute inset-0 h-full w-full" camera={{ position: [-2.15, 5.55, 11.15], fov: 50 }} dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: 'high-performance' }}>
      <color attach="background" args={['#05070d']} />
      <fog attach="fog" args={['#05070d', 18, 44]} />
      <ambientLight intensity={0.78} />
      <pointLight position={[-3, 5.6, 5.5]} intensity={30} color="#22d3ee" />
      <pointLight position={[6, 2.8, -3]} intensity={18} color="#8b5cf6" />
      <pointLight position={[-7, 1.2, -2]} intensity={12} color="#34d399" />
      <group position={sceneOffset}>
        <NetworkGrid />
        <Suspense fallback={<TopologyFallback nodes={nodes} step={step} />}>
          <Topology
            nodes={nodes}
            step={step}
            nodeLabelOffset={nodeLabelOffset}
            htmlNodeLabels={htmlNodeLabels}
            selectedNodeId={selectedNodeId}
            onNodeSelect={onNodeSelect}
            onPacketSelect={onPacketSelect}
          />
        </Suspense>
      </group>
      <CameraRig nodes={nodes} step={step} focusNonce={focusNonce} sceneOffset={sceneOffset} />
      <OrbitControls makeDefault enablePan maxDistance={18} minDistance={4.8} />
    </Canvas>
  )
}

function TopologyFallback({ nodes, step }: { nodes: TopologyNode[]; step: SimulationStep }) {
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  const links = useMemo(() => collectLinks(step), [step])
  const localScanNodes = step.visualMode === 'local-scan'
    ? (step.path.map((id) => byId.get(id)).filter(Boolean) as TopologyNode[])
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
  nodeLabelOffset,
  htmlNodeLabels,
  selectedNodeId,
  onNodeSelect,
  onPacketSelect,
}: {
  nodes: TopologyNode[]
  step: SimulationStep
  nodeLabelOffset: number
  htmlNodeLabels: boolean
  selectedNodeId?: string | null
  onNodeSelect?: (node: TopologyNode) => void
  onPacketSelect?: (step: SimulationStep) => void
}) {
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  const links = useMemo(() => collectLinks(step), [step])
  const packetPath = useMemo(() => resolvePathPoints(step.path, byId), [byId, step.path])
  const broadcastPaths = useMemo(() => collectBroadcastPaths(step, byId), [byId, step])
  const isDnsTopology = nodes.some((node) => node.id === 'localDns' || node.id === 'rootDns')
  const localScanNodes = step.visualMode === 'local-scan'
    ? (step.path.map((id) => byId.get(id)).filter(Boolean) as TopologyNode[])
    : []

  return (
    <group>
      {links.map(([from, to]) => {
        const points = resolveLinkPoints(from, to, byId)
        if (!points) return null
        const active = step.highlightLinks?.some(([a, b]) => (a === from && b === to) || (a === to && b === from))
        return (
          <Line
            key={`${from}-${to}`}
            points={points}
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
          labelOffset={nodeLabelOffset}
          htmlLabel={htmlNodeLabels}
          selectable={Boolean(onNodeSelect) && (!isDnsTopology || node.id === 'cache' || node.id === 'localDns')}
          onSelect={onNodeSelect}
        />
      ))}
      {step.visualMode === 'local-scan' && localScanNodes.length > 0 && (
        <LocalScan nodes={localScanNodes} hit={step.packetType === 'CACHE_HIT'} />
      )}
      {step.visualMode !== 'local-scan' && packetPath.length >= 2 && (
        step.broadcast && broadcastPaths.length > 0 ? (
          broadcastPaths.map((path, index) => (
            <Packet
              key={`broadcast-${step.id}-${index}`}
              path={path}
              color={packetColor(step)}
              label={packetLabel(step)}
              direction={step.direction}
              offset={index * 0.12}
              onSelect={() => onPacketSelect?.(step)}
            />
          ))
        ) : (
          <Packet
            path={packetPath}
            color={packetColor(step)}
            label={packetLabel(step)}
            direction={step.direction}
            onSelect={() => onPacketSelect?.(step)}
          />
        )
      )}
    </group>
  )
}

function NetworkNode({
  node,
  active,
  selected,
  labelOffset,
  htmlLabel,
  selectable,
  onSelect,
}: {
  node: TopologyNode
  active: boolean
  selected: boolean
  labelOffset: number
  htmlLabel: boolean
  selectable: boolean
  onSelect?: (node: TopologyNode) => void
}) {
  const group = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)

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
        if (selectable) onSelect?.(node)
      }}
      onPointerOver={(event) => {
        event.stopPropagation()
        if (selectable) {
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }
      }}
      onPointerOut={() => {
        if (selectable) {
          setHovered(false)
          document.body.style.cursor = 'auto'
        }
      }}
    >
      <group ref={group}>
        <NodeModel node={node} active={active} />
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.44, 0]}>
        <ringGeometry args={[0.62, 0.68, 56]} />
        <meshBasicMaterial color={node.color} transparent opacity={hovered ? 0.82 : active ? 0.7 : selectable ? 0.34 : 0.16} />
      </mesh>
      {hovered && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.38, 0]}>
          <ringGeometry args={[0.78, 0.84, 72]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.78} />
        </mesh>
      )}
      {htmlLabel ? (
        <Html distanceFactor={8} position={[0, labelOffset, 0]} center>
          <div className="pointer-events-none min-w-24 rounded-xl border border-cyan-200/55 bg-slate-950/88 px-3 py-1.5 text-center shadow-[0_0_22px_rgba(34,211,238,0.22)] backdrop-blur-sm">
            <div className="whitespace-nowrap text-[15px] font-black leading-tight text-slate-50">{node.label}</div>
            <div className="mt-0.5 whitespace-nowrap text-[10px] font-semibold leading-tight text-cyan-100">{node.role}</div>
          </div>
        </Html>
      ) : (
        <Billboard position={[0, labelOffset, 0]} follow>
          <Text
            fontSize={0.22}
            color="#f8fafc"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.012}
            outlineColor="#020617"
            renderOrder={20}
            material-depthTest={false}
          >
            {node.label}
          </Text>
          <Text
            position={[0, -0.24, 0]}
            fontSize={0.12}
            color="#dbeafe"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.008}
            outlineColor="#020617"
            renderOrder={20}
            material-depthTest={false}
          >
            {node.role}
          </Text>
        </Billboard>
      )}
      {node.kind === 'switch' && <SwitchPortLabels />}
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
    const ports = [
      -0.36,
      -0.12,
      0.12,
      0.36,
    ]
    return (
      <group>
        <mesh position={[0, -0.02, 0]}>
          <boxGeometry args={[1.08, 0.24, 0.62]} />
          {material}
        </mesh>
        {ports.map((x) => (
          <group key={x}>
            <mesh position={[x, 0.13, 0.36]}>
              <boxGeometry args={[0.16, 0.1, 0.08]} />
              <meshBasicMaterial color="#0f172a" />
            </mesh>
            <mesh position={[x, 0.14, 0.415]}>
              <boxGeometry args={[0.115, 0.055, 0.035]} />
              <meshBasicMaterial color="#bbf7d0" transparent opacity={active ? 1 : 0.7} />
            </mesh>
          </group>
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

function SwitchPortLabels() {
  const ports = [
    { x: -0.36, label: 'S1', device: 'DNS' },
    { x: -0.12, label: 'S2', device: 'R' },
    { x: 0.12, label: 'S3', device: 'H2' },
    { x: 0.36, label: 'S4', device: 'H1' },
  ]

  return (
    <group position={[0, 0.54, 0.52]}>
      {ports.map((port) => (
        <group key={port.label} position={[port.x, 0, 0]}>
          <Html center distanceFactor={8} transform={false}>
            <div className="pointer-events-none min-w-9 rounded border border-amber-200/60 bg-slate-950/85 px-1.5 py-1 text-center shadow-[0_0_14px_rgba(251,191,36,0.24)]">
              <div className="font-mono-data text-[10px] font-black leading-none text-amber-100">{port.label}</div>
              <div className="font-mono-data mt-0.5 text-[8px] leading-none text-cyan-100">{port.device}</div>
            </div>
          </Html>
        </group>
      ))}
    </group>
  )
}

function Packet({
  path,
  color,
  label,
  direction,
  offset = 0,
  onSelect,
}: {
  path: Array<[number, number, number]>
  color: string
  label: string
  direction?: SimulationStep['direction']
  offset?: number
  onSelect?: () => void
}) {
  const group = useRef<THREE.Group>(null)
  const curve = useMemo(() => {
    const points = path.map((point) => new THREE.Vector3(...point))
    return new THREE.CatmullRomCurve3(points)
  }, [path])

  useFrame(({ clock }) => {
    if (!group.current) return
    const t = (clock.elapsedTime * 0.28 + offset) % 1
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
      {!compact && (
        <Text
          position={points[1] ?? points[0]}
          fontSize={0.18}
          color={color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#020617"
          renderOrder={20}
          material-depthTest={false}
        >
          {hit ? 'CACHE HIT' : 'CACHE MISS'}
        </Text>
      )}
    </group>
  )
}

function CameraRig({
  nodes,
  step,
  focusNonce,
  sceneOffset,
}: {
  nodes: TopologyNode[]
  step: SimulationStep
  focusNonce: number
  sceneOffset: THREE.Vector3
}) {
  const target = useMemo(() => nodes.find((node) => node.id === step.cameraFocus), [nodes, step.cameraFocus])
  const lastFocusNonce = useRef(focusNonce)
  const focusUntil = useRef(0)

  useEffect(() => {
    if (lastFocusNonce.current === focusNonce) return
    lastFocusNonce.current = focusNonce
    focusUntil.current = performance.now() + 1200
  }, [focusNonce])

  useFrame(({ camera }) => {
    if (performance.now() > focusUntil.current) return
    if (step.visualMode === 'local-scan') {
      const focus = new THREE.Vector3(-2.95, 0.05, -0.18).add(sceneOffset)
      const desired = new THREE.Vector3(-4.45, 4.25, 10.05)
      camera.position.lerp(desired, 0.028)
      camera.lookAt(focus)
      return
    }
    if (!target) return
    const targetFocus = new THREE.Vector3(...target.position).add(sceneOffset)
    const overviewCenter = new THREE.Vector3(-2.65, sceneOffset.y, -0.55)
    const focus = targetFocus.lerp(overviewCenter, 0.68)
    const desired = focus.clone().add(new THREE.Vector3(-0.85, 5.0, 10.65))
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

function collectBroadcastPaths(
  step: SimulationStep,
  byId: Map<string, TopologyNode>,
): Array<Array<[number, number, number]>> {
  if (!step.broadcast || step.path.length < 2) return []
  const source = step.path[0]
  const hub = step.path[1]
  const floodedTargets = new Set<string>()

  step.highlightLinks?.forEach(([a, b]) => {
    if (a === hub && b !== source) floodedTargets.add(b)
    if (b === hub && a !== source) floodedTargets.add(a)
  })

  return Array.from(floodedTargets)
    .map((target) => resolvePathPoints([source, hub, target], byId))
    .filter((path) => path.length >= 3)
}

function resolvePathPoints(ids: string[], byId: Map<string, TopologyNode>) {
  const points: Array<[number, number, number]> = []
  ids.forEach((id, index) => {
    const previous = ids[index - 1]
    const next = ids[index + 1]
    const point = resolveEndpoint(id, previous ?? next, byId)
    if (point) points.push(point)
  })
  return points
}

function resolveLinkPoints(from: string, to: string, byId: Map<string, TopologyNode>) {
  const start = resolveEndpoint(from, to, byId)
  const end = resolveEndpoint(to, from, byId)
  if (!start || !end) return null
  return [start, end] as Array<[number, number, number]>
}

function resolveEndpoint(id: string, peerId: string | undefined, byId: Map<string, TopologyNode>) {
  const node = byId.get(id)
  if (!node) return undefined
  if (id !== 'switch' || !peerId) return node.position
  return switchPortPosition(node.position, peerId)
}

function switchPortPosition(base: [number, number, number], peerId: string): [number, number, number] {
  const xByPeer: Record<string, number> = {
    dns: -0.36,
    router: -0.12,
    h2: 0.12,
    h1: 0.36,
  }
  const x = xByPeer[peerId]
  if (x === undefined) return base
  return [base[0] + x, base[1] + 0.14, base[2] + 0.42]
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
