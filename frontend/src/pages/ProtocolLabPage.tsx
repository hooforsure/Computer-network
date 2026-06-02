import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '../components/AppShell'
import { NetworkScene } from '../components/NetworkScene'
import { PlaybackControls } from '../components/PlaybackControls'
import { SimulationInspector } from '../components/SimulationInspector'
import { Timeline } from '../components/Timeline'
import { createDnsSteps, dnsTopology } from '../data/dnsSimulation'
import { createTcpHandshakeSteps, createTcpReleaseSteps, tcpTopology } from '../data/tcpSimulation'
import { cn } from '../lib/classNames'
import type { TopologyNode } from '../types/simulation'

type LabMode = 'dns' | 'tcp'
type TcpMode = 'handshake' | 'release'

export function ProtocolLabPage() {
  const [labMode, setLabMode] = useState<LabMode>('dns')
  const [domain, setDomain] = useState('www.abc.com')
  const [cacheHit, setCacheHit] = useState(false)
  const [tcpMode, setTcpMode] = useState<TcpMode>('handshake')
  const [clientSeq, setClientSeq] = useState(1000)
  const [serverSeq, setServerSeq] = useState(5000)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  const steps = useMemo(() => {
    if (labMode === 'dns') return createDnsSteps(domain, cacheHit)
    return tcpMode === 'handshake'
      ? createTcpHandshakeSteps(clientSeq, serverSeq)
      : createTcpReleaseSteps(clientSeq, serverSeq)
  }, [cacheHit, clientSeq, domain, labMode, serverSeq, tcpMode])

  const topology: TopologyNode[] = labMode === 'dns' ? dnsTopology : tcpTopology
  const currentStep = steps[Math.min(index, steps.length - 1)]

  useEffect(() => {
    setIndex(0)
    setPlaying(false)
  }, [steps])

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

  function next() {
    setIndex((value) => Math.min(value + 1, steps.length - 1))
  }

  function prev() {
    setIndex((value) => Math.max(value - 1, 0))
  }

  function reset() {
    setIndex(0)
    setPlaying(false)
  }

  return (
    <AppShell title="Protocol Lab">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1500px] gap-5 px-4 py-5 xl:grid-cols-[1fr_390px]">
        <div className="flex min-h-[760px] flex-col gap-5">
          <div className="glass-panel rounded-3xl p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="font-mono-data mb-3 text-xs uppercase tracking-[0.35em] text-cyan-200">
                  Interactive protocol chamber
                </div>
                <h1 className="font-display text-3xl font-bold text-white sm:text-5xl">
                  {labMode === 'dns' ? 'DNS resolver flight path' : 'TCP state transition corridor'}
                </h1>
              </div>
              <div className="flex rounded-2xl border border-slate-700/50 bg-slate-950/50 p-1">
                <ModeButton active={labMode === 'dns'} onClick={() => setLabMode('dns')}>
                  DNS
                </ModeButton>
                <ModeButton active={labMode === 'tcp'} onClick={() => setLabMode('tcp')}>
                  TCP
                </ModeButton>
              </div>
            </div>
            <ExperimentInputs
              labMode={labMode}
              domain={domain}
              cacheHit={cacheHit}
              tcpMode={tcpMode}
              clientSeq={clientSeq}
              serverSeq={serverSeq}
              onDomainChange={setDomain}
              onCacheHitChange={setCacheHit}
              onTcpModeChange={setTcpMode}
              onClientSeqChange={setClientSeq}
              onServerSeqChange={setServerSeq}
            />
          </div>

          <div className="relative min-h-[430px] overflow-hidden rounded-3xl border border-slate-800 bg-slate-950">
            <NetworkScene nodes={topology} step={currentStep} />
            <div className="pointer-events-none absolute left-5 top-5 rounded-2xl border border-slate-700/60 bg-slate-950/70 px-4 py-3 backdrop-blur-md">
              <div className="font-mono-data text-xs uppercase tracking-[0.3em] text-slate-500">Now flying</div>
              <div className="font-display mt-1 text-lg font-bold text-white">{currentStep.packetType}</div>
            </div>
          </div>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <PlaybackControls
              current={index}
              total={steps.length}
              playing={playing}
              speed={speed}
              onPlayToggle={() => setPlaying((value) => !value)}
              onNext={next}
              onPrev={prev}
              onReset={reset}
              onSpeedChange={setSpeed}
            />
          </div>

          <Timeline steps={steps} current={index} onSelect={setIndex} />
        </div>

        <SimulationInspector step={currentStep} />
      </section>
    </AppShell>
  )
}

function ModeButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl px-5 py-2 text-sm font-bold transition',
        active ? 'bg-cyan-300 text-slate-950' : 'text-slate-300 hover:text-white',
      )}
    >
      {children}
    </button>
  )
}

function ExperimentInputs({
  labMode,
  domain,
  cacheHit,
  tcpMode,
  clientSeq,
  serverSeq,
  onDomainChange,
  onCacheHitChange,
  onTcpModeChange,
  onClientSeqChange,
  onServerSeqChange,
}: {
  labMode: LabMode
  domain: string
  cacheHit: boolean
  tcpMode: TcpMode
  clientSeq: number
  serverSeq: number
  onDomainChange: (value: string) => void
  onCacheHitChange: (value: boolean) => void
  onTcpModeChange: (value: TcpMode) => void
  onClientSeqChange: (value: number) => void
  onServerSeqChange: (value: number) => void
}) {
  if (labMode === 'dns') {
    return (
      <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-300">Domain input</span>
          <input
            value={domain}
            onChange={(event) => onDomainChange(event.target.value)}
            className="h-12 w-full rounded-2xl border border-slate-700/60 bg-slate-950/60 px-4 font-mono-data text-sm tracking-normal text-cyan-50 outline-none transition focus:border-cyan-300/80"
          />
        </label>
        <label className="flex h-12 items-center gap-3 self-end rounded-2xl border border-slate-700/60 bg-slate-950/60 px-4 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={cacheHit}
            onChange={(event) => onCacheHitChange(event.target.checked)}
            className="h-4 w-4 accent-cyan-300"
          />
          Simulate cache hit
        </label>
      </div>
    )
  }

  return (
    <div className="mt-6 grid gap-3 lg:grid-cols-4">
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-300">TCP mode</span>
        <select
          value={tcpMode}
          onChange={(event) => onTcpModeChange(event.target.value as TcpMode)}
          className="h-12 w-full rounded-2xl border border-slate-700/60 bg-slate-950/60 px-4 text-sm text-cyan-50 outline-none transition focus:border-cyan-300/80"
        >
          <option value="handshake">Three-way handshake</option>
          <option value="release">Four-way release</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-300">Client seq</span>
        <input
          type="number"
          value={clientSeq}
          onChange={(event) => onClientSeqChange(Number(event.target.value))}
          className="h-12 w-full rounded-2xl border border-slate-700/60 bg-slate-950/60 px-4 font-mono-data text-sm text-cyan-50 outline-none transition focus:border-cyan-300/80"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-300">Server seq</span>
        <input
          type="number"
          value={serverSeq}
          onChange={(event) => onServerSeqChange(Number(event.target.value))}
          className="h-12 w-full rounded-2xl border border-slate-700/60 bg-slate-950/60 px-4 font-mono-data text-sm text-cyan-50 outline-none transition focus:border-cyan-300/80"
        />
      </label>
      <div className="self-end rounded-2xl border border-violet-300/20 bg-violet-300/10 px-4 py-3 text-sm text-violet-100">
        States update on every segment.
      </div>
    </div>
  )
}
