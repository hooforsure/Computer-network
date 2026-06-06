import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '../components/AppShell'
import { NetworkScene } from '../components/NetworkScene'
import { PlaybackControls } from '../components/PlaybackControls'
import { Timeline } from '../components/Timeline'
import { ModuleSignalHeading } from '../components/VisualEffects'
import { fetchScenarioSteps } from '../api/netverseApi'
import { createScenarioSteps, scenarioDeviceSpecs, scenarioTopology } from '../data/scenarioSimulation'
import { cn } from '../lib/classNames'
import type { SimulationStep, TableSnapshot, TopologyNode } from '../types/simulation'

export function ScenarioPage() {
  const fallbackSteps = useMemo(() => createScenarioSteps(), [])
  const [steps, setSteps] = useState<SimulationStep[]>(fallbackSteps)
  const [index, setIndex] = useState(0)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const currentStep = steps[index]
  const selectedNode = selectedNodeId ? scenarioTopology.find((node) => node.id === selectedNodeId) : undefined

  useEffect(() => {
    let cancelled = false
    fetchScenarioSteps('www.abc.com')
      .then((apiSteps) => {
        if (!cancelled && apiSteps.length > 0) setSteps(apiSteps)
      })
      .catch(() => {
        if (!cancelled) setSteps(fallbackSteps)
      })
    return () => {
      cancelled = true
    }
  }, [fallbackSteps])

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
              }}
            />
          </div>
          <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_42%_56%,transparent_0%,rgba(5,7,13,0.08)_48%,rgba(5,7,13,0.74)_100%)]" />
          <div className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(90deg,rgba(5,7,13,0.86)_0%,rgba(5,7,13,0.36)_26%,transparent_55%,rgba(5,7,13,0.66)_100%)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-48 bg-gradient-to-t from-[#05070d] via-[#05070d]/62 to-transparent" />

          <div className="pointer-events-none relative z-10 flex min-h-[calc(100vh-4rem)] w-full flex-col px-6 py-8 xl:px-12">
            <header className="pointer-events-auto flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <ModuleSignalHeading
                eyebrow="Integrated communication scenario"
                title="H1 visits www.abc.com"
                description="Step from t0 to t1 through ARP, DNS resolution, gateway discovery, and the first HTTP Ethernet frame received by switch S."
                accent="amber"
              />
              <div className="grid max-w-md grid-cols-3 gap-2 text-center">
                <StatPill label="步骤" value="8" />
                <StatPill label="交换机端口" value="1 / 2 / 3 / 4" />
                <StatPill label="终点" value="t1" />
              </div>
            </header>

            <div className="pointer-events-auto mt-6">
              <Timeline steps={steps} current={index} onSelect={setIndex} />
            </div>
            <div className="pointer-events-auto mt-3 flex justify-end">
              <PlaybackControls
                current={index}
                onNext={() => setIndex((value) => Math.min(value + 1, steps.length - 1))}
                onPrev={() => setIndex((value) => Math.max(value - 1, 0))}
                onReset={() => {
                  setIndex(0)
                }}
              />
            </div>

            <div className="mt-10 grid flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="relative min-h-[500px]" />

              <div className="pointer-events-auto justify-self-end xl:w-[420px]">
                <ScenarioDock
                  step={currentStep}
                  index={index}
                  total={steps.length}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 mx-auto max-w-[1500px] px-4 py-10">
          <ScenarioBottomTables
            step={currentStep}
            selectedNode={selectedNode}
          />
          <div className="xl:hidden">
            <ScenarioDock
              step={currentStep}
              index={index}
              total={steps.length}
            />
          </div>
        </section>
      </section>
    </AppShell>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-24 border-y border-slate-700/50 bg-slate-950/35 px-3 py-3">
      <div className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="font-display mt-1 text-sm font-bold text-white">{value}</div>
    </div>
  )
}

function ScenarioDock({ step, index, total }: { step: SimulationStep; index: number; total: number }) {
  return (
    <aside className="min-h-[560px] border border-slate-800/80 bg-slate-950/68 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <FlowDockContent step={step} index={index} total={total} />
    </aside>
  )
}

function FlowDockContent({ step, index, total }: { step: SimulationStep; index: number; total: number }) {
  const requirement = step.requirement
  const sourceTarget = requirement ? `${requirement.source} -> ${requirement.target}` : `${step.fromNode} -> ${step.toNode}`
  const protocolText = String(step.packetFields.Protocol ?? step.protocol)
  const rawCommunicationType = requirement?.communicationType ?? (step.broadcast ? '广播' : '单播')
  const communicationType = rawCommunicationType === '外部递归' ? '单播' : rawCommunicationType
  const topologyPath = requirement?.topologyPath ?? step.path.join(' -> ')

  return (
    <div className="space-y-4">
      <div>
        <div className="font-mono-data mb-2 text-xs uppercase tracking-[0.3em] text-cyan-200">
          实验步骤
        </div>
        <h2 className="font-display text-2xl font-bold text-white">
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')} · {step.title}
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <FactCard label="协议" value={protocolText} tone="cyan" />
        <FactCard label="通信方式" value={communicationType} tone={step.broadcast ? 'amber' : 'emerald'} />
      </div>

      <section className="border-y border-slate-800 py-4">
        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">起点 {'->'} 终点</div>
        <div className="font-display mt-1 text-xl font-bold leading-7 text-white">{sourceTarget}</div>
        <p className="mt-3 text-sm leading-6 text-slate-300">{requirement?.purpose ?? step.explanation}</p>
      </section>

      <section className="grid gap-3">
        <AddressPair
          title="二层帧 MAC"
          sourceLabel="源 MAC"
          sourceValue={requirement?.sourceMac ?? String(step.packetFields['Src MAC'] ?? '-')}
          targetLabel="目的 MAC"
          targetValue={requirement?.destinationMac ?? String(step.packetFields['Dst MAC'] ?? '-')}
        />
        <AddressPair
          title="三层数据报 IP"
          sourceLabel="源 IP"
          sourceValue={requirement?.sourceIp ?? String(step.packetFields['Src IP'] ?? '-')}
          targetLabel="目的 IP"
          targetValue={requirement?.destinationIp ?? String(step.packetFields['Dst IP'] ?? step.packetFields['Target IP'] ?? '-')}
        />
      </section>

      <section className="border-y border-cyan-300/20 bg-cyan-300/[0.04] px-3 py-3">
        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">拓扑传输路径</div>
        <div className="font-mono-data mt-2 break-words text-sm leading-6 text-cyan-50">{topologyPath}</div>
      </section>

      <section className="grid gap-2">
        <ChangeLine label="交换机 S 处理行为" value={requirement?.switchAction ?? '-'} tone="amber" />
        <ChangeLine label="S 交换表变化" value={compactChange(requirement?.macTableChange)} tone="emerald" />
        <ChangeLine label="H1 ARP 表变化" value={compactChange(requirement?.arpTableChange)} tone="cyan" />
      </section>

      <section className="border-y border-emerald-300/20 bg-emerald-300/[0.04] px-3 py-3">
        <div className="font-mono-data mb-2 text-xs uppercase tracking-[0.22em] text-emerald-200">
          当前帧 / 报文内容
        </div>
        <div className="font-mono-data break-words text-sm leading-6 text-emerald-100">
          {requirement?.framePayload ?? step.log}
        </div>
      </section>
    </div>
  )
}

function FactCard({ label, value, tone }: { label: string; value: string; tone: 'cyan' | 'emerald' | 'amber' }) {
  const toneClass = {
    cyan: 'border-cyan-300/30 bg-cyan-300/10 text-cyan-50',
    emerald: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-50',
    amber: 'border-amber-300/30 bg-amber-300/10 text-amber-50',
  }[tone]

  return (
    <div className={cn('border px-3 py-3', toneClass)}>
      <div className="text-[10px] uppercase tracking-[0.16em] opacity-70">{label}</div>
      <div className="font-mono-data mt-1 break-words text-sm font-bold leading-5">{value}</div>
    </div>
  )
}

function AddressPair({
  title,
  sourceLabel,
  sourceValue,
  targetLabel,
  targetValue,
}: {
  title: string
  sourceLabel: string
  sourceValue: string
  targetLabel: string
  targetValue: string
}) {
  return (
    <div className="border border-slate-800/80 bg-slate-950/38 p-3">
      <div className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">{title}</div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <MiniField label={sourceLabel} value={sourceValue} />
        <span className="font-mono-data text-slate-500">{'->'}</span>
        <MiniField label={targetLabel} value={targetValue} />
      </div>
    </div>
  )
}

function ChangeLine({ label, value, tone }: { label: string; value: string; tone: 'cyan' | 'emerald' | 'amber' }) {
  const toneClass = {
    cyan: 'text-cyan-100',
    emerald: 'text-emerald-100',
    amber: 'text-amber-100',
  }[tone]

  return (
    <div className="border-l border-slate-700 bg-slate-950/35 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className={cn('font-mono-data mt-1 break-words text-xs leading-5', toneClass)}>{value}</div>
    </div>
  )
}

function compactChange(value?: string) {
  if (!value) return '-'
  return /^无/.test(value) || /无新增|保持|不变/.test(value) ? '-' : value
}

function ScenarioBottomTables({
  step,
  selectedNode
}: {
  step: SimulationStep
  selectedNode?: TopologyNode
}) {
  void selectedNode
  const arpTable = step.tables?.find((table) => table.label === 'H1 ARP Table')
  const macTable = step.tables?.find((table) => table.label === 'Switch S MAC Table')
  const deviceTable: TableSnapshot = {
    label: '固定端口 / 地址',
    columns: ['Device', 'IP', 'MAC', 'Port'],
    rows: scenarioDeviceSpecs
      .filter((item) => item.id !== 'web')
      .map((item) => ({
        Device: item.device,
        IP: item.ip,
        MAC: item.mac,
        Port: item.port,
      })),
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <LiveTablePanel
          title="H1 ARP 表"
          table={arpTable}
        />
        <LiveTablePanel
          title="交换机 S MAC 表"
          table={macTable}
        />
      </div>
      <LiveTablePanel
        title="固定端口与地址"
        table={deviceTable}
        compact
      />
    </section>
  )
}

function LiveTablePanel({
  title,
  table,
  compact = false,
}: {
  title: string
  table?: TableSnapshot
  compact?: boolean
}) {
  return (
    <section className="border border-slate-800/80 bg-slate-950/62 p-5 backdrop-blur-xl">
      <div className="mb-4">
        <h2 className="font-display text-xl font-bold text-white">{title}</h2>
      </div>
      {table ? <DataTable table={table} compact={compact} /> : <div className="h-14 border-y border-slate-800" />}
    </section>
  )
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-800/90 px-1 py-3">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="font-mono-data mt-1 break-words text-xs leading-5 text-cyan-50">{value}</div>
    </div>
  )
}

function DataTable({ table, compact = false }: { table: TableSnapshot; compact?: boolean }) {
  return (
    <div className="overflow-hidden border-y border-slate-800">
      {table.rows.length === 0 ? (
        <div className="h-14" />
      ) : (
        table.rows.map((row, rowIndex) => (
          <div key={`${table.label}-${rowIndex}`} className="border-t border-slate-800/80 px-3 py-3 first:border-t-0">
            <div className={cn('grid gap-3', compact ? 'sm:grid-cols-4' : 'sm:grid-cols-3')}>
              {table.columns.map((column) => (
                <div
                  key={column}
                  className="min-w-0 border-b border-slate-800/70 pb-2 last:border-b-0"
                >
                  <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{column}</div>
                  <div className="font-mono-data mt-1 min-w-0 [overflow-wrap:anywhere] text-xs leading-5 text-cyan-50">
                    {row[column]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
