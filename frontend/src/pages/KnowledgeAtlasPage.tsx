import { Canvas, useFrame } from '@react-three/fiber'
import { Html, Line, OrbitControls } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Pencil, Plus, Save, Search, Trash2, X } from 'lucide-react'
import * as THREE from 'three'
import { AppShell } from '../components/AppShell'
import { NetVerseMagicBento } from '../components/NetVerseMagicBento'
import { ModuleSignalHeading } from '../components/VisualEffects'
import { deleteKnowledgePoint, fetchKnowledgePoints, saveKnowledgePoint } from '../api/netverseApi'
import { cn } from '../lib/classNames'

type KnowledgeLayer = '应用层' | '传输层' | '网络层' | '数据链路层' | '物理层'
type KnowledgeTab = KnowledgeLayer | '知识图谱'

interface LayerProfile {
  layer: KnowledgeLayer
  functionText: string
  protocols: string[]
  devices: string[]
  dataUnit: string
  accent: string
}

interface KnowledgePoint {
  id: string
  layer: KnowledgeLayer
  title: string
  category: string
  summary: string
  detail: string
}

interface GraphNode {
  id: string
  label: string
  type: 'root' | 'layer' | 'concept' | 'point'
  layer?: KnowledgeLayer
  accent: string
  position: [number, number, number]
  point?: KnowledgePoint
}

const storageKey = 'netverse-knowledge-atlas-v3'
const pageSize = 6

const layerProfiles: LayerProfile[] = [
  {
    layer: '应用层',
    functionText: '为用户应用进程提供网络服务，定义应用进程之间如何交换报文。',
    protocols: ['HTTP', 'DNS', 'FTP', 'SMTP', 'POP3/IMAP', 'DHCP'],
    devices: ['客户端', 'Web 服务器', 'DNS 服务器', '邮件服务器', '代理服务器'],
    dataUnit: '应用报文',
    accent: '#22d3ee',
  },
  {
    layer: '传输层',
    functionText: '实现端到端、进程到进程通信，负责端口复用/分用、可靠传输、流量控制和拥塞控制。',
    protocols: ['TCP', 'UDP', '端口', '滑动窗口', '拥塞控制'],
    devices: ['主机进程', '客户端/服务器端套接字'],
    dataUnit: 'TCP 报文段 / UDP 用户数据报',
    accent: '#8b5cf6',
  },
  {
    layer: '网络层',
    functionText: '负责跨网络寻址、路由选择和分组转发，让数据从源主机到达目的主机。',
    protocols: ['IP', 'ICMP', 'ARP', 'RIP', 'OSPF', 'BGP', 'NAT'],
    devices: ['路由器', '三层交换机', '网关'],
    dataUnit: 'IP 数据报 / 分组',
    accent: '#f59e0b',
  },
  {
    layer: '数据链路层',
    functionText: '在同一链路或局域网内传输帧，处理封装成帧、差错检测、MAC 地址和交换机转发。',
    protocols: ['Ethernet', 'PPP', 'CRC/FCS', 'CSMA/CD', 'VLAN'],
    devices: ['交换机', '网卡', '网桥', '集线器'],
    dataUnit: '帧',
    accent: '#34d399',
  },
  {
    layer: '物理层',
    functionText: '把比特转换为电信号、光信号或无线电波，规定接口、传输媒体、编码、调制和复用方式。',
    protocols: ['编码', '调制', 'FDM/TDM/WDM/CDM', '奈氏准则', '香农公式'],
    devices: ['双绞线', '光纤', '无线链路', '中继器', '集线器'],
    dataUnit: '比特',
    accent: '#94a3b8',
  },
]

const seedPoints: KnowledgePoint[] = [
  point('app-dns', '应用层', 'DNS 域名解析', '协议', '把域名解析为 IP 地址，包含缓存、递归/迭代和层次服务器。', 'DNS 查询通常使用 UDP 53。客户端先查本地缓存，再请求本地 DNS；本地 DNS 可向根、TLD、权威服务器逐级查询，最终返回 A/AAAA 等记录。'),
  point('app-http', '应用层', 'HTTP 请求与响应', '协议', '浏览器和 Web 服务器交换资源的应用层协议。', 'HTTP 请求由方法、URL、首部和可选主体组成；响应包含状态码、首部和响应体。HTTP 通常运行在 TCP 之上，HTTPS 还会经过 TLS。'),
  point('app-dhcp', '应用层', 'DHCP 动态主机配置', '协议', '为主机自动分配 IP、子网掩码、网关和 DNS。', '典型流程为 Discover、Offer、Request、ACK，可降低网络接入配置成本。'),
  point('app-mail', '应用层', 'SMTP / POP3 / IMAP / MIME', '协议', '电子邮件发送、接收和内容封装相关协议。', 'SMTP 用于发送邮件，POP3/IMAP 用于读取邮件，MIME 用于支持附件和多媒体内容。'),
  point('tcp-handshake', '传输层', 'TCP 三次握手', '连接管理', '通过 SYN、SYN+ACK、ACK 建立可靠连接。', '三次握手同步双方初始序号，并确认双方收发能力正常。状态通常从 CLOSED/LISTEN 进入 SYN-SENT、SYN-RECEIVED，最终 ESTABLISHED。'),
  point('tcp-release', '传输层', 'TCP 四次挥手', '连接管理', '通过 FIN/ACK 分别关闭两个方向的数据流。', 'TCP 是全双工连接，双方发送方向需要独立关闭。TIME-WAIT 用于确保最后 ACK 可重传并让旧报文在网络中消失。'),
  point('udp', '传输层', 'UDP', '协议', '无连接、开销小、不保证可靠交付的传输协议。', 'UDP 适合 DNS、实时音视频等场景。它保留端口复用/分用能力，但没有重传、拥塞控制和连接状态。'),
  point('tcp-congestion', '传输层', 'TCP 拥塞控制', '机制', '通过慢开始、拥塞避免、快重传、快恢复控制发送速率。', '拥塞窗口 cwnd 根据网络反馈动态变化，目标是在提高吞吐量的同时避免网络过载。'),
  point('ip', '网络层', 'IP 数据报与寻址', '协议', '提供逻辑地址和尽力而为的分组交付。', 'IP 首部包含源/目的 IP、TTL、协议号、标识、片偏移等字段。路由器根据目的 IP 查表转发。'),
  point('arp', '网络层', 'ARP 地址解析', '协议', '已知 IPv4 地址，查询同一局域网内对应 MAC 地址。', 'ARP Request 使用广播，ARP Reply 通常单播。跨网段通信时，主机查询的是默认网关的 MAC，而不是远端主机 MAC。'),
  point('routing', '网络层', '路由表与最长前缀匹配', '机制', '根据目的 IP 选择下一跳和出口接口。', '路由表项通常包含目的网络、掩码、下一跳和接口。最长前缀匹配选择最具体的路由。'),
  point('icmp', '网络层', 'ICMP 与 ping', '协议', '用于差错报告和网络探测。', 'ping 使用 ICMP Echo Request/Reply。TTL 超时会触发 ICMP 超时报文，traceroute 正是利用这一点。'),
  point('nat', '网络层', 'NAT 地址转换', '机制', '在私网地址和公网地址之间进行映射。', 'NAT 常用于家庭/校园网络，使多个内网主机共享公网地址，也会影响端到端连接。'),
  point('ethernet', '数据链路层', '以太网帧', '帧格式', '在局域网内封装源 MAC、目的 MAC 和上层数据。', '以太网帧包含目的 MAC、源 MAC、类型字段、数据和 FCS。跨网段时 IP 目的地址不变，但 MAC 地址逐跳变化。'),
  point('switch-learning', '数据链路层', '交换机自学习', '设备行为', '交换机根据入端口学习源 MAC 到端口的映射。', '已知目的 MAC 时定向转发，未知目的 MAC 或广播帧时泛洪。交换机表变化是综合链路题高频考点。'),
  point('crc', '数据链路层', 'CRC / FCS 差错检测', '机制', '用冗余校验序列检测帧传输错误。', '发送方按生成多项式计算 FCS，接收方做同样除法检查余数。CRC 能发现大多数传输错误，但不负责纠错。'),
  point('ppp', '数据链路层', 'PPP 协议', '协议', '点对点链路上的数据链路层协议。', 'PPP 支持封装成帧、透明传输和差错检测，常见组成包括 LCP 和 NCP。'),
  point('vlan', '数据链路层', 'VLAN', '技术', '在二层网络中划分逻辑广播域。', 'VLAN 可减少广播范围并增强管理能力，常通过 802.1Q 标签标识所属 VLAN。'),
  point('bitrate', '物理层', '比特率与波特率', '概念', '区分每秒比特数和每秒码元数。', '若一个码元有 M 种状态，则每个码元携带 log2(M) bit，比特率 = 波特率 × log2(M)。'),
  point('nyquist', '物理层', '奈氏准则', '计算', '理想低通信道的最高码元传输速率。', '理想低通信道最高码元率为 2W Baud，若每个码元有 V 种状态，则最高比特率为 2Wlog2(V)。'),
  point('shannon', '物理层', '香农公式', '计算', '有噪声信道的极限信息传输速率。', 'C = W log2(1 + S/N)。若题目给 dB，需要先用 10log10(S/N) 转换为普通信噪比。'),
  point('multiplexing', '物理层', '复用技术', '技术', '多路信号共享同一传输媒体。', '常见方式包括 FDM、TDM、STDM、WDM 和 CDM。不同方式在频率、时间、波长或码片维度区分用户。'),
]

export function KnowledgeAtlasPage() {
  const [points, setPoints] = useState<KnowledgePoint[]>(() => loadPoints())
  const [activeTab, setActiveTab] = useState<KnowledgeTab>('应用层')
  const [query, setQuery] = useState('')
  const [pageByLayer, setPageByLayer] = useState<Record<string, number>>({})
  const [selectedId, setSelectedId] = useState(seedPoints[0].id)
  const [selectedNodeId, setSelectedNodeId] = useState(seedPoints[0].id)
  const [editing, setEditing] = useState<KnowledgePoint | null>(null)
  const selected = points.find((item) => item.id === selectedId) ?? points[0]
  const activeLayer = activeTab === '知识图谱' ? '应用层' : activeTab
  const activeProfile = layerProfiles.find((profile) => profile.layer === activeLayer) ?? layerProfiles[0]
  const graph = useMemo(() => createGraph(points), [points])
  const selectedNode = graphNodeById(graph, selectedNodeId) ?? graphNodeById(graph, selectedId)

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(points))
  }, [points])

  useEffect(() => {
    let cancelled = false
    fetchKnowledgePoints()
      .then((apiPoints) => {
        if (cancelled || apiPoints.length === 0) return
        setPoints(apiPoints)
        setSelectedId(apiPoints[0].id)
        setSelectedNodeId(apiPoints[0].id)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return points.filter((item) => {
      const layerMatched = item.layer === activeLayer
      const keywordMatched = !keyword
        || item.title.toLowerCase().includes(keyword)
        || item.category.toLowerCase().includes(keyword)
        || item.summary.toLowerCase().includes(keyword)
        || item.detail.toLowerCase().includes(keyword)
      return layerMatched && keywordMatched
    })
  }, [activeLayer, points, query])

  const page = pageByLayer[activeLayer] ?? 1
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pagePoints = filtered.slice((page - 1) * pageSize, page * pageSize)

  function setLayerPage(nextPage: number) {
    setPageByLayer((rows) => ({ ...rows, [activeLayer]: Math.max(1, Math.min(totalPages, nextPage)) }))
  }

  function selectPoint(point: KnowledgePoint) {
    setSelectedId(point.id)
    setSelectedNodeId(point.id)
  }

  function createPoint(layer: KnowledgeLayer = activeLayer) {
    setEditing({
      id: `kp-${Date.now()}`,
      layer,
      title: '新知识点',
      category: '概念',
      summary: '填写本知识点的核心含义。',
      detail: '补充协议作用、相关设备、报文字段、典型例子或易错点。',
    })
  }

  async function savePoint(pointToSave: KnowledgePoint) {
    const exists = points.some((item) => item.id === pointToSave.id)
    try {
      const saved = await saveKnowledgePoint(pointToSave, exists)
      setPoints((rows) => {
        const alreadyExists = rows.some((item) => item.id === saved.id)
        return alreadyExists
          ? rows.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...rows]
      })
      setSelectedId(saved.id)
      setActiveTab(saved.layer)
    } catch {
      setPoints((rows) => {
        return exists
          ? rows.map((item) => (item.id === pointToSave.id ? pointToSave : item))
          : [pointToSave, ...rows]
      })
      setSelectedId(pointToSave.id)
      setActiveTab(pointToSave.layer)
    } finally {
      setEditing(null)
    }
  }

  async function deletePoint(id: string) {
    try {
      await deleteKnowledgePoint(id)
    } catch {
      // Keep the UI usable even if the backend is temporarily unavailable.
    }
    setPoints((rows) => rows.filter((item) => item.id !== id))
    if (selectedId === id) setSelectedId(points.find((item) => item.id !== id)?.id ?? '')
  }

  return (
    <AppShell title="Knowledge">
      <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-[#05070d]">
        <section className="relative h-[calc(100vh-4rem)] min-h-[760px] overflow-hidden max-lg:h-auto max-lg:min-h-[900px]">
          <KnowledgeGraph3D
            graph={graph}
            selectedId={selectedNodeId}
            onSelect={(node) => {
              setSelectedNodeId(node.id)
              if (node.point) selectPoint(node.point)
              if (node.layer) setActiveTab(node.layer)
            }}
          />
          <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_54%_48%,transparent_0%,rgba(5,7,13,0.06)_54%,rgba(5,7,13,0.7)_100%)]" />
          <div className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(90deg,rgba(5,7,13,0.9)_0%,rgba(5,7,13,0.24)_24%,transparent_54%,rgba(5,7,13,0.26)_72%,rgba(5,7,13,0.86)_100%)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-48 bg-gradient-to-t from-[#05070d] via-[#05070d]/80 to-transparent" />
          <div className="absolute left-5 top-8 z-10 max-w-4xl sm:left-8 xl:left-12">
            <ModuleSignalHeading
              eyebrow="TCP/IP 五层知识体系"
              title="网络知识宇宙"
              accent="emerald"
            />
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => createPoint(activeLayer)}
                className="inline-flex h-12 min-w-[142px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-emerald-300/50 bg-emerald-300 px-5 text-sm font-bold leading-none text-slate-950 shadow-[0_0_34px_rgba(52,211,153,0.26)] transition hover:bg-emerald-200"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap leading-none">新增知识点</span>
              </button>
              <NetVerseMagicBento
                as="a"
                href="#knowledge-stack"
                accent="#22d3ee"
                className="inline-flex h-12 items-center justify-center rounded-full border border-slate-500/50 bg-slate-950/35 px-5 text-sm font-semibold text-slate-100 backdrop-blur-md transition hover:border-cyan-300/70"
              >
                查看五层知识库
              </NetVerseMagicBento>
            </div>
          </div>
          <div className="absolute right-5 top-10 z-10 hidden w-[390px] xl:right-12 xl:block">
            <GraphDetailPanel selected={selected} selectedNode={selectedNode} />
          </div>
        </section>

        <section className="relative z-10 mx-auto mt-5 max-w-[1500px] px-4 xl:hidden">
          <GraphDetailPanel selected={selected} selectedNode={selectedNode} />
        </section>

        <section id="knowledge-stack" className="relative z-10 mx-auto grid max-w-[1500px] gap-8 px-4 py-10 xl:grid-cols-[340px_1fr]">
          <FiveLayerRail activeTab={activeTab} onSelect={setActiveTab} />
          <main>
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <label className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-slate-700/60 bg-slate-950/60 px-3">
                <Search className="h-4 w-4 text-slate-500" />
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setLayerPage(1)
                  }}
                  className="w-full bg-transparent text-sm text-cyan-50 outline-none"
                  placeholder="查询知识点、协议、设备或关键字..."
                />
              </label>
            </div>

            <LayerOpenSection
              profile={activeProfile}
              points={pagePoints}
              page={page}
              totalPages={totalPages}
              selectedId={selectedId}
              onPageChange={setLayerPage}
              onSelectPoint={selectPoint}
              onEditPoint={setEditing}
              onDeletePoint={deletePoint}
              onCreatePoint={() => createPoint(activeLayer)}
            />
          </main>
        </section>

        {editing && (
          <KnowledgeEditorModal
            point={editing}
            onChange={setEditing}
            onSave={savePoint}
            onClose={() => setEditing(null)}
          />
        )}
      </section>
    </AppShell>
  )
}

function KnowledgeGraph3D({
  graph,
  selectedId,
  onSelect,
}: {
  graph: ReturnType<typeof createGraph>
  selectedId?: string
  onSelect: (node: GraphNode) => void
}) {
  return (
    <Canvas className="absolute inset-0 z-0 h-full w-full" camera={{ position: [0, 2.2, 12.8], fov: 58 }} dpr={[1, 1.8]} gl={{ antialias: true }}>
      <color attach="background" args={['#05070d']} />
      <fog attach="fog" args={['#05070d', 26, 62]} />
      <ambientLight intensity={0.8} />
      <pointLight position={[0, 7, 7]} intensity={30} color="#34d399" />
      <pointLight position={[8, 2, -4]} intensity={18} color="#22d3ee" />
      <GraphStage />
      <GraphConstellation graph={graph} selectedId={selectedId} onSelect={onSelect} />
      <GraphCameraRig />
      <OrbitControls makeDefault enablePan maxDistance={42} minDistance={5.8} />
    </Canvas>
  )
}

function GraphStage() {
  return (
    <group>
      <gridHelper args={[28, 28, '#14532d', '#102033']} position={[0, -5.85, 0]} />
      <mesh position={[0, -5.88, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[32, 22]} />
        <meshBasicMaterial color="#05070d" transparent opacity={0.32} />
      </mesh>
      {[2.2, 4.2, 6.2].map((radius) => (
        <mesh key={radius} position={[0, 1.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius, 0.008, 8, 96]} />
          <meshBasicMaterial color="#34d399" transparent opacity={0.22} />
        </mesh>
      ))}
      <mesh position={[1.25, -0.4, 0]}>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshBasicMaterial color="#67e8f9" />
      </mesh>
    </group>
  )
}

function GraphCameraRig() {
  useFrame(({ camera }) => {
    camera.lookAt(0.8, -0.8, 0)
  })

  return null
}

function GraphConstellation({
  graph,
  selectedId,
  onSelect,
}: {
  graph: ReturnType<typeof createGraph>
  selectedId?: string
  onSelect: (node: GraphNode) => void
}) {
  const group = useRef<THREE.Group>(null)
  const nodeMap = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes])

  useFrame(({ clock }) => {
    if (!group.current) return
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.18) * 0.08
  })

  return (
    <group ref={group} position={[1.25, -0.4, 0]}>
      {graph.links.map((link) => {
        const source = nodeMap.get(link.source)
        const target = nodeMap.get(link.target)
        if (!source || !target) return null
        return (
          <Line
            key={`${link.source}-${link.target}`}
            points={[source.position, target.position]}
            color="#64748b"
            transparent
            opacity={0.48}
            lineWidth={1.25}
          />
        )
      })}
      {graph.nodes.map((node) => (
        <KnowledgeGraphNode
          key={node.id}
          node={node}
          selected={node.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </group>
  )
}

function KnowledgeGraphNode({
  node,
  selected,
  onSelect,
}: {
  node: GraphNode
  selected: boolean
  onSelect: (node: GraphNode) => void
}) {
  const ref = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const radius = node.type === 'root' ? 0.72 : node.type === 'layer' ? 0.54 : node.type === 'concept' ? 0.3 : 0.24

  useFrame(({ clock }) => {
    if (!ref.current) return
    const pulse = selected ? 1.14 + Math.sin(clock.elapsedTime * 5) * 0.06 : hovered ? 1.18 : 1
    ref.current.scale.setScalar(pulse)
  })

  return (
    <group
      ref={ref}
      position={node.position}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(node)
      }}
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = ''
      }}
    >
      <mesh>
        <sphereGeometry args={[radius, 36, 36]} />
        <meshStandardMaterial color={node.accent} emissive={node.accent} emissiveIntensity={selected ? 3.4 : hovered ? 2.2 : 1.3} roughness={0.22} metalness={0.28} />
      </mesh>
      {(node.type === 'root' || node.type === 'layer' || selected || hovered) && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius * (hovered ? 1.95 : 1.65), 0.012, 8, 64]} />
          <meshBasicMaterial color={node.accent} transparent opacity={selected ? 0.95 : hovered ? 0.82 : 0.52} />
        </mesh>
      )}
      {node.type !== 'root' && node.type !== 'layer' && (selected || hovered) && (
        <Html distanceFactor={10} position={[0, radius + 0.22, 0]} center>
          <div className="pointer-events-none max-w-[260px] whitespace-nowrap rounded-xl border border-emerald-300/50 bg-slate-950/85 px-3 py-1.5 text-center text-xs font-bold text-emerald-50 shadow-[0_0_28px_rgba(52,211,153,0.24)] backdrop-blur-md">
            {node.label}
          </div>
        </Html>
      )}
      {(node.type === 'root' || node.type === 'layer') && (
        <Html distanceFactor={12} position={[0, radius + 0.5, 0]} center>
          <div
            className="pointer-events-none whitespace-nowrap rounded-xl border bg-slate-950/80 px-3 py-1.5 text-center font-mono-data text-xs font-bold text-slate-50 shadow-[0_0_24px_rgba(34,211,238,0.2)] backdrop-blur-md"
            style={{ borderColor: node.accent }}
          >
            {node.label}
          </div>
        </Html>
      )}
    </group>
  )
}

function GraphDetailPanel({ selected, selectedNode }: { selected?: KnowledgePoint; selectedNode?: GraphNode }) {
  const panelTitle = selectedNode?.point?.title ?? selectedNode?.label ?? selected?.title ?? '选择一个节点'
  const panelLayer = selectedNode?.layer ?? selected?.layer ?? '-'
  const panelCategory = selectedNode?.point?.category ?? graphNodeTypeLabel(selectedNode?.type)
  const panelSummary = selectedNode?.point?.summary ?? graphNodeSummary(selectedNode)
  const panelDetail = selectedNode?.point?.detail ?? graphNodeDetail(selectedNode)

  return (
    <NetVerseMagicBento as="aside" accent={selectedNode?.accent ?? '#34d399'} className="rounded-[2rem] border border-slate-800 bg-slate-950/74 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur-md">
      <div className="font-mono-data mb-2 text-xs uppercase tracking-[0.3em] text-emerald-200">节点详情</div>
      <h2 className="font-display text-2xl font-bold text-white">{panelTitle}</h2>
      <div className="mt-4 grid gap-3">
        <Metric label="所属层" value={panelLayer} />
        <Metric label="分类" value={panelCategory} />
        <Metric label="摘要" value={panelSummary} />
      </div>
      <NetVerseMagicBento className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/45 p-4 text-sm leading-6 text-slate-300" accent={selectedNode?.accent ?? '#34d399'}>
        {panelDetail}
      </NetVerseMagicBento>
    </NetVerseMagicBento>
  )
}

function graphNodeById(graph: ReturnType<typeof createGraph>, id?: string) {
  if (!id) return undefined
  return graph.nodes.find((node) => node.id === id)
}

function graphNodeTypeLabel(type?: GraphNode['type']) {
  if (type === 'root') return '知识体系'
  if (type === 'layer') return '网络层级'
  if (type === 'concept') return '协议 / 设备 / 技术'
  if (type === 'point') return '知识点'
  return '-'
}

function graphNodeSummary(node?: GraphNode) {
  if (!node) return '-'
  if (node.type === 'root') return '计算机网络课程知识体系的顶层入口。'
  if (node.type === 'layer') {
    const profile = layerProfiles.find((item) => item.layer === node.layer)
    return profile?.functionText ?? 'TCP/IP 五层模型中的一个分层。'
  }
  if (node.type === 'concept') return `${node.label} 是 ${node.layer ?? '本体系'} 中关联的协议、设备、技术或数据单位。`
  return node.point?.summary ?? '-'
}

function graphNodeDetail(node?: GraphNode) {
  if (!node) return '点击图谱中的协议、设备、技术或知识点节点后，这里会展示详情。'
  if (node.type === 'root') return '顶层节点连接应用层、传输层、网络层、数据链路层和物理层，用来展示课程知识从抽象应用到物理信号的整体结构。'
  if (node.type === 'layer') {
    const profile = layerProfiles.find((item) => item.layer === node.layer)
    if (!profile) return '该层节点可以切换下方知识库中的对应分层。'
    return `常见协议或技术：${profile.protocols.join(' / ')}。相关设备或数据单位：${profile.devices.join(' / ')}；数据单位为 ${profile.dataUnit}。`
  }
  if (node.type === 'concept') return '该节点来自本层的协议、设备、技术或数据单位清单。它和下方知识点共同构成后续后端数据库中的结构化知识图谱数据。'
  return node.point?.detail ?? '该知识点会在下方卡片中同步高亮，可继续编辑、删除或扩展。'
}

function FiveLayerRail({ activeTab, onSelect }: { activeTab: KnowledgeTab; onSelect: (tab: KnowledgeTab) => void }) {
  return (
    <aside className="sticky top-20 h-fit">
      <div className="mb-4 px-1">
        <div className="font-mono-data text-xs uppercase tracking-[0.3em] text-slate-500">TCP/IP STACK</div>
        <h2 className="font-display mt-2 text-3xl font-bold text-white">五层纵向模型</h2>
      </div>
      <div className="relative">
        {layerProfiles.map((profile, index) => (
          <NetVerseMagicBento
            key={profile.layer}
            as="button"
            type="button"
            onClick={() => onSelect(profile.layer)}
            accent={profile.accent}
            active={activeTab === profile.layer}
            className={cn(
              'group relative mb-3 w-full overflow-hidden rounded-[1.55rem] border p-4 text-left transition duration-300 hover:-translate-y-0.5',
              activeTab === profile.layer
                ? 'border-emerald-300/70 bg-slate-950/88 shadow-[0_0_34px_rgba(52,211,153,0.14)]'
                : 'border-slate-800/80 bg-slate-950/42 hover:border-slate-600 hover:bg-slate-950/70',
            )}
          >
            <div className="flex min-w-0 items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-display text-lg font-bold text-white">{profile.layer}</div>
                <div className="font-mono-data mt-1 truncate text-[10px] uppercase tracking-[0.16em] text-slate-500">{profile.dataUnit}</div>
              </div>
              <span className="font-mono-data flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full border bg-slate-950/70 text-[10px]" style={{ borderColor: profile.accent, color: profile.accent }}>
                L{index + 1}
              </span>
            </div>
          </NetVerseMagicBento>
        ))}
      </div>
    </aside>
  )
}

function LayerOpenSection({
  profile,
  points,
  page,
  totalPages,
  selectedId,
  onPageChange,
  onSelectPoint,
  onEditPoint,
  onDeletePoint,
  onCreatePoint,
}: {
  profile: LayerProfile
  points: KnowledgePoint[]
  page: number
  totalPages: number
  selectedId?: string
  onPageChange: (page: number) => void
  onSelectPoint: (point: KnowledgePoint) => void
  onEditPoint: (point: KnowledgePoint) => void
  onDeletePoint: (id: string) => void
  onCreatePoint: () => void
}) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-slate-800/70 bg-slate-950/32 p-5">
      <div className="absolute inset-x-0 top-0 h-px opacity-80" style={{ background: `linear-gradient(90deg, transparent, ${profile.accent}, transparent)` }} />
      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <div>
          <div className="font-mono-data mb-2 text-xs uppercase tracking-[0.3em]" style={{ color: profile.accent }}>LAYER PROFILE</div>
          <h2 className="font-display text-4xl font-bold text-white">{profile.layer}</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">{profile.functionText}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="数据单位" value={profile.dataUnit} />
          <Metric label="协议 / 技术" value={profile.protocols.join(' / ')} />
          <Metric label="相关设备" value={profile.devices.join(' / ')} />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div>
          <div className="font-mono-data text-xs uppercase tracking-[0.28em] text-emerald-200">知识点清单</div>
          <h3 className="font-display mt-1 text-2xl font-bold text-white">分页浏览、查询与维护</h3>
        </div>
        <button
          type="button"
          onClick={onCreatePoint}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-300/40 bg-emerald-300/10 px-4 text-sm font-bold text-emerald-100 transition hover:bg-emerald-300 hover:text-slate-950"
        >
          <Plus className="h-4 w-4" />
          添加到本层
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {points.length === 0 ? (
          <NetVerseMagicBento className="md:col-span-2 rounded-3xl border border-slate-800 bg-slate-950/45 p-10 text-center text-slate-500" accent={profile.accent}>
            当前筛选条件下没有知识点。
          </NetVerseMagicBento>
        ) : (
          points.map((item) => (
            <KnowledgeCard
              key={item.id}
              point={item}
              active={item.id === selectedId}
              accent={profile.accent}
              onSelect={() => onSelectPoint(item)}
              onEdit={() => onEditPoint(item)}
              onDelete={() => onDeletePoint(item.id)}
            />
          ))
        )}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <NetVerseMagicBento as="button" type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} accent={profile.accent} className="rounded-2xl border border-slate-700/70 bg-slate-950/45 px-4 py-2 text-sm font-bold text-slate-300 transition hover:border-emerald-300/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-35">上一页</NetVerseMagicBento>
        <span className="font-mono-data text-sm text-emerald-100">{page} / {totalPages}</span>
        <NetVerseMagicBento as="button" type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} accent={profile.accent} className="rounded-2xl border border-slate-700/70 bg-slate-950/45 px-4 py-2 text-sm font-bold text-slate-300 transition hover:border-emerald-300/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-35">下一页</NetVerseMagicBento>
      </div>
    </section>
  )
}

function KnowledgeCard({
  point,
  active,
  accent,
  onSelect,
  onEdit,
  onDelete,
}: {
  point: KnowledgePoint
  active: boolean
  accent: string
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <NetVerseMagicBento
      as="article"
      onClick={onSelect}
      accent={accent}
      active={active}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-[1.65rem] border bg-slate-950/42 p-5 transition duration-300 hover:-translate-y-1 hover:bg-slate-950/78',
        active ? 'border-emerald-300/70 shadow-[0_0_34px_rgba(52,211,153,0.12)]' : 'border-slate-800/80 hover:border-slate-600',
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px opacity-90" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full opacity-0 blur-3xl transition group-hover:opacity-20" style={{ background: accent }} />
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="font-mono-data inline-flex rounded-full border border-slate-700/70 bg-slate-950/70 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">{point.category}</div>
          <h3 className="font-display mt-2 text-2xl font-bold text-white">{point.title}</h3>
        </div>
        <div className="flex translate-y-1 gap-2 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
          <button
            type="button"
            title="编辑知识点"
            onClick={(event) => {
              event.stopPropagation()
              onEdit()
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-100 transition hover:bg-cyan-300 hover:text-slate-950"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="删除知识点"
            onClick={(event) => {
              event.stopPropagation()
              onDelete()
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-300/30 bg-rose-300/10 text-rose-100 transition hover:bg-rose-300 hover:text-slate-950"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="text-sm leading-6 text-slate-300">{point.summary}</p>
      <p className="mt-4 line-clamp-3 text-xs leading-5 text-slate-500">{point.detail}</p>
    </NetVerseMagicBento>
  )
}

function KnowledgeEditorModal({
  point,
  onChange,
  onSave,
  onClose,
}: {
  point: KnowledgePoint
  onChange: (point: KnowledgePoint) => void
  onSave: (point: KnowledgePoint) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/76 p-4 backdrop-blur-md">
      <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-emerald-300/30 bg-slate-950 p-6 shadow-[0_0_90px_rgba(52,211,153,0.18)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="font-mono-data mb-2 text-xs uppercase tracking-[0.3em] text-emerald-200">知识点编辑</div>
            <h2 className="font-display text-3xl font-bold text-white">{point.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 text-slate-300 hover:border-cyan-300/50 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <EditorField label="标题" value={point.title} onChange={(value) => onChange({ ...point, title: value })} />
        <label className="mb-3 block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">所属层</span>
          <select
            value={point.layer}
            onChange={(event) => onChange({ ...point, layer: event.target.value as KnowledgeLayer })}
            className="h-11 w-full rounded-2xl border border-slate-700/60 bg-slate-950/60 px-3 text-sm text-cyan-50 outline-none"
          >
            {layerProfiles.map((profile) => <option key={profile.layer}>{profile.layer}</option>)}
          </select>
        </label>
        <EditorField label="分类" value={point.category} onChange={(value) => onChange({ ...point, category: value })} />
        <EditorField label="摘要" value={point.summary} onChange={(value) => onChange({ ...point, summary: value })} multiline />
        <EditorField label="详情" value={point.detail} onChange={(value) => onChange({ ...point, detail: value })} multiline />
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-2xl border border-slate-700 px-5 py-2.5 text-sm font-bold text-slate-300 hover:text-white">取消</button>
          <button type="button" onClick={() => onSave(point)} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-300 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-200">
            <Save className="h-4 w-4" />
            保存
          </button>
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <NetVerseMagicBento className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4 backdrop-blur-sm" accent="#34d399">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="font-mono-data mt-2 break-words text-sm text-cyan-50">{value}</div>
    </NetVerseMagicBento>
  )
}

function EditorField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-28 w-full resize-none rounded-2xl border border-slate-700/60 bg-slate-950/60 px-3 py-3 text-sm leading-6 text-cyan-50 outline-none"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full rounded-2xl border border-slate-700/60 bg-slate-950/60 px-3 text-sm text-cyan-50 outline-none"
        />
      )}
    </label>
  )
}

function createGraph(points: KnowledgePoint[]) {
  const nodes: GraphNode[] = []
  const links: Array<{ source: string; target: string }> = []
  nodes.push({ id: 'root', label: '计算机网络', type: 'root', accent: '#f8fafc', position: [0, 4.4, 0] })

  layerProfiles.forEach((profile, layerIndex) => {
    const layerY = 2.35 - layerIndex * 1.82
    const layerX = 0
    const side = layerIndex % 2 === 0 ? -1 : 1
    const layerNode: GraphNode = {
      id: `layer-${profile.layer}`,
      label: profile.layer,
      type: 'layer',
      layer: profile.layer,
      accent: profile.accent,
      position: [layerX, layerY, 0],
    }
    nodes.push(layerNode)
    links.push({ source: 'root', target: layerNode.id })

    const concepts = [...profile.protocols.slice(0, 4), ...profile.devices.slice(0, 2), profile.dataUnit]
    concepts.forEach((name, index) => {
      const angle = (index / concepts.length) * Math.PI * 2
      const ringRadius = 3.85 + (index % 2) * 1.05
      const node: GraphNode = {
        id: `${profile.layer}-${name}`,
        label: name,
        type: 'concept',
        layer: profile.layer,
        accent: profile.accent,
        position: [
          layerX + side * (5.7 + Math.abs(Math.cos(angle)) * ringRadius),
          layerY + Math.sin(angle) * 1.02,
          Math.sin(angle * 1.25) * 3.55,
        ],
      }
      nodes.push(node)
      links.push({ source: layerNode.id, target: node.id })
    })

    points.filter((pointItem) => pointItem.layer === profile.layer).slice(0, 5).forEach((pointItem, index) => {
      const angle = -Math.PI / 2 + (index / 5) * Math.PI * 1.15
      const ringRadius = 4.25 + (index % 2) * 1.05
      const node: GraphNode = {
        id: pointItem.id,
        label: pointItem.title,
        type: 'point',
        layer: pointItem.layer,
        accent: profile.accent,
        point: pointItem,
        position: [
          layerX - side * (6.15 + Math.abs(Math.cos(angle)) * ringRadius),
          layerY - 0.86 + Math.sin(angle) * 1.02,
          -3.75 - Math.cos(angle * 1.1) * 2.25,
        ],
      }
      nodes.push(node)
      links.push({ source: layerNode.id, target: node.id })
    })
  })

  return { nodes, links }
}

function point(id: string, layer: KnowledgeLayer, title: string, category: string, summary: string, detail: string): KnowledgePoint {
  return { id, layer, title, category, summary, detail }
}

function loadPoints() {
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored) return JSON.parse(stored) as KnowledgePoint[]
  } catch {
    // localStorage 异常时回退到种子数据。
  }
  return seedPoints
}
