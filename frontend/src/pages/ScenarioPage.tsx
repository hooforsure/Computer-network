import { useEffect, useMemo, useState } from 'react'
import { FileText } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { NetworkScene } from '../components/NetworkScene'
import { PlaybackControls } from '../components/PlaybackControls'
import { Timeline } from '../components/Timeline'
import { createScenarioSteps, scenarioDeviceSpecs, scenarioTopology } from '../data/scenarioSimulation'
import { cn } from '../lib/classNames'
import type { SimulationStep, TableSnapshot, TopologyNode } from '../types/simulation'

type DockMode = 'flow' | 'node'

export function ScenarioPage() {
  const steps = useMemo(() => createScenarioSteps(), [])
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [dockMode, setDockMode] = useState<DockMode>('flow')
  const currentStep = steps[index]
  const selectedNode = selectedNodeId ? scenarioTopology.find((node) => node.id === selectedNodeId) : undefined
  const nodeInfoCards = useMemo(() => createScenarioNodeInfoCards(currentStep), [currentStep])
  const selectedSceneCard = selectedNodeId ? nodeInfoCards[selectedNodeId] : undefined

  useEffect(() => {
    if (!playing) return
    const timeout = window.setTimeout(() => {
      setIndex((value) => {
        if (value >= steps.length - 1) {
          setPlaying(false)
          return value
        }
        return value + 1
      })
    }, 1500 / speed)

    return () => window.clearTimeout(timeout)
  }, [index, playing, speed, steps.length])

  return (
    <AppShell title="Scenario">
      <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-[#05070d]">
        <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
          <div className="absolute inset-0">
            <NetworkScene
              nodes={scenarioTopology}
              step={currentStep}
              focusNonce={index}
              selectedNodeId={selectedNodeId}
              onNodeSelect={(node) => {
                setSelectedNodeId(node.id)
                setDockMode('node')
              }}
              onPacketSelect={() => setDockMode('flow')}
            />
          </div>
          <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_52%_50%,transparent_0%,rgba(5,7,13,0.12)_46%,rgba(5,7,13,0.88)_100%)]" />
          <div className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(90deg,rgba(5,7,13,0.95)_0%,rgba(5,7,13,0.50)_28%,transparent_52%,rgba(5,7,13,0.78)_100%)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-56 bg-gradient-to-t from-[#05070d] via-[#05070d]/82 to-transparent" />

          <div className="pointer-events-none relative z-10 flex min-h-[calc(100vh-4rem)] w-full flex-col px-6 py-8 xl:px-12">
            <header className="pointer-events-auto flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="font-mono-data mb-4 text-xs uppercase tracking-[0.42em] text-amber-200">
                  综合通信过程可视化
                </div>
                <h1 className="font-display max-w-4xl text-5xl font-extrabold leading-none text-white drop-shadow-[0_0_30px_rgba(251,191,36,0.14)] sm:text-7xl">
                  H1 访问 www.abc.com
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                  从 t0 到 t1，按步骤展示 ARP 查询 DNS、DNS 解析、ARP 查询网关，以及 HTTP 以太网帧第一次进入交换机 S 的全过程。
                </p>
              </div>
              <div className="grid max-w-md grid-cols-3 gap-2 text-center">
                <StatPill label="步骤" value="8" />
                <StatPill label="动态表" value="ARP / MAC" />
                <StatPill label="终点" value="t1" />
              </div>
            </header>

            <div className="pointer-events-auto mt-6">
              <Timeline steps={steps} current={index} onSelect={setIndex} />
            </div>
            <div className="pointer-events-auto mt-3 flex justify-start">
              <PlaybackControls
                current={index}
                total={steps.length}
                playing={playing}
                speed={speed}
                onPlayToggle={() => setPlaying((value) => !value)}
                onNext={() => setIndex((value) => Math.min(value + 1, steps.length - 1))}
                onPrev={() => setIndex((value) => Math.max(value - 1, 0))}
                onReset={() => {
                  setIndex(0)
                  setPlaying(false)
                }}
                onSpeedChange={setSpeed}
              />
            </div>

            <div className="mt-6 grid flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="relative min-h-[470px]">
                <div className="pointer-events-none absolute left-0 top-0 rounded-2xl border border-slate-700/60 bg-slate-950/65 px-4 py-3 backdrop-blur-md">
                  <div className="font-mono-data text-xs uppercase tracking-[0.3em] text-slate-500">当前报文</div>
                  <div className="font-display mt-1 text-lg font-bold text-white">{currentStep.packetType}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setDockMode('flow')}
                  className="pointer-events-auto absolute left-0 top-24 inline-flex items-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100 backdrop-blur-md transition hover:border-cyan-300/70 hover:bg-cyan-300/15"
                >
                  <FileText className="h-4 w-4" />
                  查看当前流程
                </button>
              </div>

              <div className="pointer-events-auto justify-self-end xl:w-[420px]">
                <ScenarioDock
                  mode={dockMode}
                  step={currentStep}
                  index={index}
                  total={steps.length}
                  selectedNode={selectedNode}
                  onModeChange={setDockMode}
                  onSelectNode={setSelectedNodeId}
                />
                <div className="mt-3 rounded-2xl border border-slate-700/60 bg-slate-950/70 px-4 py-3 text-xs leading-5 text-slate-300 backdrop-blur-md">
                  点击设备，可在拓扑棋盘中查看它的状态和表。
                </div>
              </div>
            </div>
          </div>

          {selectedSceneCard && (
            <SceneDeviceCard
              card={selectedSceneCard}
              nodeId={selectedNodeId}
              onClose={() => setSelectedNodeId(null)}
            />
          )}
        </section>

        <section className="relative z-10 mx-auto grid max-w-[1500px] gap-5 px-4 py-10 xl:grid-cols-[minmax(0,1fr)_420px]">
          <ScenarioBottomTables
            step={currentStep}
            onOpenH1={() => {
              setSelectedNodeId('h1')
              setDockMode('node')
            }}
            onOpenSwitch={() => {
              setSelectedNodeId('switch')
              setDockMode('node')
            }}
          />
          <div className="xl:hidden">
            <ScenarioDock
              mode={dockMode}
              step={currentStep}
              index={index}
              total={steps.length}
              selectedNode={selectedNode}
              onModeChange={setDockMode}
              onSelectNode={setSelectedNodeId}
            />
          </div>
        </section>
      </section>
    </AppShell>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-24 rounded-2xl border border-slate-700/50 bg-slate-950/45 px-3 py-3">
      <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="font-display mt-1 text-sm font-bold text-white">{value}</div>
    </div>
  )
}

function createScenarioNodeInfoCards(step: SimulationStep) {
  const arpTable = step.tables?.find((table) => table.label === 'H1 ARP Table')
  const macTable = step.tables?.find((table) => table.label === 'Switch S MAC Table')
  const deviceCards = Object.fromEntries(
    scenarioTopology.map((node) => {
      const spec = scenarioDeviceSpecs.find((item) => item.id === node.id)
      const activeTable = node.id === 'h1' ? arpTable : node.id === 'switch' ? macTable : undefined
      return [
        node.id,
        {
          title: node.label,
          subtitle: node.id === 'h1' ? 'H1 ARP 表' : node.id === 'switch' ? '交换机 MAC 表' : '设备状态',
          accent: node.color,
          fields: [
            { label: 'IP', value: spec?.ip ?? node.state?.IP ?? '-' },
            { label: 'MAC', value: spec?.mac ?? node.state?.MAC ?? '-' },
            { label: '端口', value: spec?.port ?? node.state?.['Switch port'] ?? '-' },
            { label: '状态', value: describeNodeImpact(node, step) },
          ],
          table: activeTable
            ? {
                columns: activeTable.columns,
                rows: activeTable.rows,
                empty: activeTable.label.includes('ARP') ? 'H1 ARP 表为空' : '交换机 MAC 表为空',
              }
            : undefined,
        },
      ]
    }),
  )

  return deviceCards
}

function SceneDeviceCard({
  card,
  nodeId,
  onClose,
}: {
  card: ReturnType<typeof createScenarioNodeInfoCards>[string]
  nodeId: string | null
  onClose: () => void
}) {
  return (
    <div className={cn('absolute z-20 w-80', sceneCardPosition(nodeId))}>
      <div
        className="rounded-3xl border bg-slate-950/82 p-4 shadow-[0_0_50px_rgba(34,211,238,0.18)] backdrop-blur-xl"
        style={{ borderColor: card.accent }}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="font-mono-data text-[10px] uppercase tracking-[0.24em] text-slate-500">{card.subtitle}</div>
            <h3 className="font-display mt-1 text-xl font-bold text-white">{card.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700/70 bg-slate-950/70 px-2 py-1 text-xs font-bold text-slate-300 transition hover:border-cyan-300/60 hover:text-white"
          >
            关闭
          </button>
        </div>
        <div className="grid gap-2">
          {card.fields.slice(0, 3).map((field) => (
            <div key={field.label} className="grid grid-cols-[58px_1fr] gap-2 rounded-xl border border-slate-800/80 bg-slate-950/50 px-3 py-2">
              <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{field.label}</span>
              <span className="font-mono-data break-words text-[11px] leading-4 text-cyan-50">{field.value}</span>
            </div>
          ))}
        </div>
        {card.table && (
          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-950/45">
            <div
              className="grid bg-slate-900/85 text-[10px] uppercase tracking-[0.12em] text-slate-400"
              style={{ gridTemplateColumns: `repeat(${card.table.columns.length}, minmax(0, 1fr))` }}
            >
              {card.table.columns.map((column) => (
                <div key={column} className="px-2 py-2">{column}</div>
              ))}
            </div>
            {card.table.rows.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-500">{card.table.empty}</div>
            ) : (
              card.table.rows.map((row, index) => (
                <div
                  key={`${card.title}-${index}`}
                  className="grid border-t border-slate-800/80 text-[11px]"
                  style={{ gridTemplateColumns: `repeat(${card.table?.columns.length ?? 1}, minmax(0, 1fr))` }}
                >
                  {card.table?.columns.map((column) => (
                    <div key={column} className="font-mono-data break-words px-2 py-2 text-cyan-50">{row[column]}</div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function sceneCardPosition(nodeId: string | null) {
  switch (nodeId) {
    case 'h1':
      return 'left-28 bottom-20'
    case 'h2':
      return 'left-24 top-24'
    case 'dns':
      return 'left-[34%] top-16'
    case 'switch':
      return 'left-[42%] top-24'
    case 'router':
      return 'right-36 bottom-24'
    case 'web':
      return 'right-20 top-36'
    default:
      return 'right-8 bottom-20'
  }
}

function ScenarioDock({
  mode,
  step,
  index,
  total,
  selectedNode,
  onModeChange,
  onSelectNode,
}: {
  mode: DockMode
  step: SimulationStep
  index: number
  total: number
  selectedNode?: TopologyNode
  onModeChange: (mode: DockMode) => void
  onSelectNode: (id: string) => void
}) {
  return (
    <aside className="glass-panel min-h-[560px] rounded-3xl p-5">
      <div className="mb-4 flex rounded-2xl border border-slate-700/50 bg-slate-950/50 p-1">
        <DockTab active={mode === 'flow'} onClick={() => onModeChange('flow')}>流程</DockTab>
        <DockTab active={mode === 'node'} onClick={() => onModeChange('node')}>设备</DockTab>
      </div>

      {mode === 'flow' && <FlowDockContent step={step} index={index} total={total} />}
      {mode === 'node' && (
        <NodeDockContent
          step={step}
          node={selectedNode}
          onSelectNode={onSelectNode}
        />
      )}
    </aside>
  )
}

function DockTab({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 rounded-xl px-3 py-2 text-sm font-bold transition',
        active ? 'bg-cyan-300 text-slate-950' : 'text-slate-300 hover:text-white',
      )}
    >
      {children}
    </button>
  )
}

function FlowDockContent({ step, index, total }: { step: SimulationStep; index: number; total: number }) {
  const requirement = step.requirement
  const sourceTarget = requirement ? `${requirement.source} -> ${requirement.target}` : `${step.fromNode} -> ${step.toNode}`

  return (
    <div>
      <div className="font-mono-data mb-2 text-xs uppercase tracking-[0.3em] text-cyan-200">
        报文流控制台
      </div>
      <h2 className="font-display text-2xl font-bold text-white">
        {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')} · {step.title}
      </h2>

      <div className="mt-4 rounded-3xl border border-cyan-300/25 bg-cyan-300/8 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="font-mono-data rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">
            {step.protocol}
          </span>
          <span className={cn(
            'font-mono-data rounded-full border px-3 py-1 text-xs',
            step.broadcast
              ? 'border-amber-300/40 bg-amber-300/10 text-amber-100'
              : 'border-emerald-300/40 bg-emerald-300/10 text-emerald-100',
          )}>
            {requirement?.communicationType ?? (step.broadcast ? '广播' : '单播')}
          </span>
        </div>
        <div className="font-display text-xl font-bold text-white">{sourceTarget}</div>
        <p className="mt-3 text-sm leading-6 text-slate-300">{requirement?.purpose ?? step.explanation}</p>
      </div>

      <div className="mt-4 rounded-3xl border border-emerald-300/20 bg-emerald-300/8 p-4">
        <div className="font-mono-data mb-2 text-xs uppercase tracking-[0.22em] text-emerald-200">
          报文 / 帧载荷
        </div>
        <div className="font-mono-data break-words text-sm leading-6 text-emerald-100">
          {requirement?.framePayload ?? step.log}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <MiniField label="Src MAC" value={requirement?.sourceMac ?? String(step.packetFields['Src MAC'] ?? '-')} />
        <MiniField label="Dst MAC" value={requirement?.destinationMac ?? String(step.packetFields['Dst MAC'] ?? '-')} />
        <MiniField label="Src IP" value={requirement?.sourceIp ?? String(step.packetFields['Src IP'] ?? '-')} />
        <MiniField label="Dst IP" value={requirement?.destinationIp ?? String(step.packetFields['Dst IP'] ?? step.packetFields['Target IP'] ?? '-')} />
      </div>

      <div className="mt-4 grid gap-3">
        <MiniField label="拓扑路径" value={requirement?.topologyPath ?? step.path.join(' -> ')} />
        <MiniField label="交换机处理" value={requirement?.switchAction ?? '-'} />
        <MiniField label="S MAC 表变化" value={requirement?.macTableChange ?? '-'} />
        <MiniField label="H1 ARP 表变化" value={requirement?.arpTableChange ?? '-'} />
        <MiniField label="结束状态" value={requirement?.endState ?? step.log} />
      </div>
    </div>
  )
}

function NodeDockContent({
  step,
  node,
  onSelectNode,
}: {
  step: SimulationStep
  node?: TopologyNode
  onSelectNode: (id: string) => void
}) {
  const arpTable = step.tables?.find((table) => table.label === 'H1 ARP Table')
  const macTable = step.tables?.find((table) => table.label === 'Switch S MAC Table')
  const spec = node ? scenarioDeviceSpecs.find((item) => item.id === node.id) : undefined
  const activeTable = node?.id === 'h1' ? arpTable : node?.id === 'switch' ? macTable : undefined

  return (
    <div>
      <div className="font-mono-data mb-2 text-xs uppercase tracking-[0.3em] text-violet-200">
        设备状态台
      </div>
      <h2 className="font-display text-2xl font-bold text-white">{node?.label ?? '选择设备'}</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {scenarioTopology.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectNode(item.id)}
            className={cn(
              'rounded-xl border px-3 py-2 text-xs font-bold transition',
              node?.id === item.id
                ? 'border-cyan-300/70 bg-cyan-300 text-slate-950'
                : 'border-slate-700/60 bg-slate-950/45 text-slate-300 hover:border-cyan-300/50 hover:text-white',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {node && (
        <div className="mt-4 grid gap-3">
          <MiniField label="IP" value={spec?.ip ?? node.state?.IP ?? '-'} />
          <MiniField label="MAC" value={spec?.mac ?? node.state?.MAC ?? '-'} />
          <MiniField label="端口 / 角色" value={`${spec?.port ?? '-'} · ${spec?.role ?? node.role}`} />
          {activeTable ? (
            <DataTable table={activeTable} />
          ) : (
            <>
              <MiniField label="当前影响" value={describeNodeImpact(node, step)} />
              <MiniField label="路径关系" value={step.path.includes(node.id) ? `位于路径：${step.path.join(' -> ')}` : '不在当前报文路径上'} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ScenarioBottomTables({
  step,
  onOpenH1,
  onOpenSwitch,
}: {
  step: SimulationStep
  onOpenH1: () => void
  onOpenSwitch: () => void
}) {
  const arpTable = step.tables?.find((table) => table.label === 'H1 ARP Table')
  const macTable = step.tables?.find((table) => table.label === 'Switch S MAC Table')

  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <LiveTablePanel title="H1 ARP Table" table={arpTable} onOpen={onOpenH1} />
      <LiveTablePanel title="Switch S MAC Table" table={macTable} onOpen={onOpenSwitch} />
    </section>
  )
}

function LiveTablePanel({ title, table, onOpen }: { title: string; table?: TableSnapshot; onOpen: () => void }) {
  return (
    <section className="glass-panel rounded-3xl p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="font-mono-data mb-1 text-xs uppercase tracking-[0.28em] text-cyan-200">动态表</div>
          <h2 className="font-display text-xl font-bold text-white">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:border-cyan-300/70"
        >
          查看设备
        </button>
      </div>
      {table ? <DataTable table={table} /> : <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4 text-sm text-slate-500">空表</div>}
    </section>
  )
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-3">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="font-mono-data mt-1 break-words text-xs leading-5 text-cyan-50">{value}</div>
    </div>
  )
}

function DataTable({ table }: { table: TableSnapshot }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-900/80 text-slate-400">
          <tr>
            {table.columns.map((column) => (
              <th key={column} className="px-3 py-2 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.length === 0 ? (
            <tr>
              <td colSpan={table.columns.length} className="px-3 py-4 text-center text-slate-500">
                空表
              </td>
            </tr>
          ) : (
            table.rows.map((row, rowIndex) => (
              <tr key={`${table.label}-${rowIndex}`} className="border-t border-slate-800/80">
                {table.columns.map((column) => (
                  <td key={column} className="font-mono-data px-3 py-2 text-cyan-50">
                    {row[column]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function describeNodeImpact(node: TopologyNode, step: SimulationStep) {
  if (node.id === 'dns' && step.id === 'scn-04') return '递归/迭代查询互联网 DNS 体系，并把 www.abc.com 的 A 记录返回给 H1'
  if (node.id === 'router' && step.id === 'scn-06') return '回复网关 MAC，使 H1 可以把外网 HTTP 帧交给默认网关'
  if (node.id === 'h2' && step.broadcast) return '收到广播 ARP 请求，但目标 IP 不是 H2，因此不会回复'
  if (node.id === 'web' && step.id === 'scn-07') return '作为三层目的 IP 所代表的最终 Web 服务端；二层帧当前只送到网关'
  if (step.highlightNodes?.includes(node.id)) return '参与或接收当前步骤的通信行为'
  return '当前步骤没有主动通信动作'
}
