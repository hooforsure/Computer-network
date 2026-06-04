import { useEffect, useMemo, useState } from 'react'
import { Link2, Unlink } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { NetworkScene } from '../components/NetworkScene'
import { PlaybackControls } from '../components/PlaybackControls'
import { SimulationInspector } from '../components/SimulationInspector'
import { Timeline } from '../components/Timeline'
import {
  createDnsIdleStep,
  createDnsSteps,
  createDnsTopology,
  normalizeDomain,
  resolveDnsIp,
  upsertCacheRow,
  type DnsCacheRecord,
} from '../data/dnsSimulation'
import { createTcpHandshakeSteps, createTcpReleaseSteps, tcpTopology } from '../data/tcpSimulation'
import { cn } from '../lib/classNames'
import type { TopologyNode } from '../types/simulation'

type LabMode = 'dns' | 'tcp'
type TcpMode = 'handshake' | 'release'
type DnsRunStatus = 'idle' | 'running' | 'cache-hit' | 'completed' | 'reset'

export function ProtocolLabPage() {
  const [labMode, setLabMode] = useState<LabMode>('dns')
  const [domain, setDomain] = useState('www.abc.com')
  const [dnsCache, setDnsCache] = useState<DnsCacheRecord[]>([])
  const [activeDnsRecord, setActiveDnsRecord] = useState<DnsCacheRecord | undefined>(undefined)
  const [dnsRun, setDnsRun] = useState(0)
  const [dnsRunStatus, setDnsRunStatus] = useState<DnsRunStatus>('idle')
  const [dnsMaxUnlockedIndex, setDnsMaxUnlockedIndex] = useState(0)
  const [committedDnsRun, setCommittedDnsRun] = useState<number | null>(null)
  const [focusNonce, setFocusNonce] = useState(0)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [completionNotice, setCompletionNotice] = useState<{ domain: string; ip: string; mode: 'hit' | 'resolved' } | null>(null)
  const [tcpMode, setTcpMode] = useState<TcpMode>('handshake')
  const [clientSeq, setClientSeq] = useState(1000)
  const [serverSeq, setServerSeq] = useState(5000)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const normalizedDomain = normalizeDomain(domain)
  const cachedRecord = dnsCache.find((record) => record.domain === normalizedDomain)
  const runCachedRecord = activeDnsRecord?.domain === normalizedDomain ? activeDnsRecord : undefined

  const steps = useMemo(() => {
    if (labMode === 'dns' && dnsRunStatus === 'idle') return [createDnsIdleStep(domain, dnsCache)]
    if (labMode === 'dns') return createDnsSteps(domain, { cachedRecord: runCachedRecord, cacheRows: dnsCache })
    return tcpMode === 'handshake'
      ? createTcpHandshakeSteps(clientSeq, serverSeq)
      : createTcpReleaseSteps(clientSeq, serverSeq)
  }, [clientSeq, dnsCache, dnsRunStatus, domain, labMode, runCachedRecord, serverSeq, tcpMode])

  const topology: TopologyNode[] = labMode === 'dns' ? createDnsTopology(domain) : tcpTopology
  const currentStep = steps[Math.min(index, steps.length - 1)]
  const selectedNode = selectedNodeId ? topology.find((node) => node.id === selectedNodeId) : undefined

  useEffect(() => {
    setIndex(0)
    setPlaying(false)
  }, [dnsRun, labMode, tcpMode])

  useEffect(() => {
    if (labMode !== 'dns') return
    if (currentStep.id !== 'dns-09') return
    if (committedDnsRun === dnsRun) return
    commitDnsResolution()
  }, [committedDnsRun, currentStep.id, dnsRun, labMode, normalizedDomain])

  useEffect(() => {
    if (labMode !== 'dns') return
    if (currentStep.id !== 'dns-10') return
    setCompletionNotice({ domain: normalizedDomain, ip: resolveDnsIp(normalizedDomain), mode: 'resolved' })
  }, [currentStep.id, labMode, normalizedDomain])

  useEffect(() => {
    if (!playing) return
    const timeout = window.setTimeout(() => {
      setIndex((value) => {
        if (value >= steps.length - 1) {
          setPlaying(false)
          if (labMode === 'dns' && runCachedRecord) setDnsRunStatus('cache-hit')
          return value
        }
        const nextIndex = value + 1
        if (labMode === 'dns') setDnsMaxUnlockedIndex((max) => Math.max(max, nextIndex))
        if (labMode === 'dns') setFocusNonce((nonce) => nonce + 1)
        return nextIndex
      })
    }, 1500 / speed)

    return () => window.clearTimeout(timeout)
  }, [index, labMode, playing, runCachedRecord, speed, steps.length])

  function next() {
    if (labMode === 'dns' && dnsRunStatus === 'idle') {
      beginDnsRun()
      return
    }
    setIndex((value) => {
      const nextIndex = Math.min(value + 1, steps.length - 1)
      if (labMode === 'dns') setDnsMaxUnlockedIndex((max) => Math.max(max, nextIndex))
      if (labMode === 'dns') setFocusNonce((nonce) => nonce + 1)
      return nextIndex
    })
  }

  function prev() {
    setIndex((value) => Math.max(value - 1, 0))
    setFocusNonce((nonce) => nonce + 1)
  }

  function reset() {
    setIndex(0)
    setPlaying(false)
    if (labMode === 'dns') {
      setActiveDnsRecord(undefined)
      setDnsRunStatus('reset')
      setDnsMaxUnlockedIndex(0)
      setCompletionNotice(null)
      setDnsRun((value) => value + 1)
      setFocusNonce((nonce) => nonce + 1)
    }
  }

  function runDnsQuery() {
    setLabMode('dns')
    const record = dnsCache.find((row) => row.domain === normalizeDomain(domain))
    setActiveDnsRecord(record)
    setDnsRunStatus(record ? 'cache-hit' : 'running')
    setDnsMaxUnlockedIndex(record ? 0 : 1)
    setDnsRun((value) => value + 1)
    setIndex(0)
    setPlaying(false)
    setCompletionNotice(record ? { domain: normalizeDomain(domain), ip: record.ip, mode: 'hit' } : null)
    setFocusNonce((nonce) => nonce + 1)
  }

  function beginDnsRun() {
    if (labMode !== 'dns') return
    runDnsQuery()
  }

  function handlePlayToggle() {
    if (labMode === 'dns' && dnsRunStatus === 'idle') {
      const record = dnsCache.find((row) => row.domain === normalizeDomain(domain))
      setActiveDnsRecord(record)
      setDnsRunStatus(record ? 'cache-hit' : 'running')
      setDnsMaxUnlockedIndex(record ? 0 : 1)
      setDnsRun((value) => value + 1)
      setIndex(0)
      setPlaying(!record)
      setCompletionNotice(record ? { domain: normalizeDomain(domain), ip: record.ip, mode: 'hit' } : null)
      setFocusNonce((nonce) => nonce + 1)
      return
    }
    setPlaying((value) => !value)
  }

  function selectTimelineStep(nextIndex: number) {
    if (labMode === 'dns' && nextIndex > dnsMaxUnlockedIndex) return
    setIndex(nextIndex)
  }

  function commitDnsResolution() {
    const ip = resolveDnsIp(normalizedDomain)
    setDnsCache((rows) => upsertCacheRow(rows, {
      domain: normalizedDomain,
      ip,
      ttl: '300s',
      source: 'resolver',
    }))
    setCommittedDnsRun(dnsRun)
    setDnsRunStatus('completed')
    setCompletionNotice({ domain: normalizedDomain, ip, mode: 'resolved' })
  }

  function clearDnsCache() {
    setDnsCache([])
    setActiveDnsRecord(undefined)
    setDnsRunStatus('idle')
    setDnsMaxUnlockedIndex(0)
    setCompletionNotice(null)
    setDnsRun((value) => value + 1)
  }

  function deleteDnsCacheRecord(domainToDelete: string) {
    setDnsCache((rows) => rows.filter((row) => row.domain !== domainToDelete))
    if (activeDnsRecord?.domain === domainToDelete) setActiveDnsRecord(undefined)
    if (normalizeDomain(domain) === domainToDelete) {
      setDnsRunStatus('idle')
      setDnsMaxUnlockedIndex(0)
      setCompletionNotice(null)
      setDnsRun((value) => value + 1)
    }
  }

  const terminalDnsRun = labMode === 'dns' && (
    dnsRunStatus === 'cache-hit'
    || (dnsRunStatus === 'completed' && currentStep.id === 'dns-10')
  )

  return (
    <AppShell title="Protocol Lab">
      <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-[#05070d]">
        <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
          <div className="absolute inset-0">
            <NetworkScene
              nodes={topology}
              step={currentStep}
              focusNonce={focusNonce}
              onNodeSelect={(node) => setSelectedNodeId(node.id)}
            />
          </div>
          <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_42%_56%,transparent_0%,rgba(5,7,13,0.08)_48%,rgba(5,7,13,0.74)_100%)]" />
          <div className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(90deg,rgba(5,7,13,0.86)_0%,rgba(5,7,13,0.36)_26%,transparent_55%,rgba(5,7,13,0.66)_100%)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-48 bg-gradient-to-t from-[#05070d] via-[#05070d]/62 to-transparent" />

          <div className="pointer-events-none relative z-10 flex min-h-[calc(100vh-4rem)] w-full flex-col px-6 py-8 xl:px-12">
            <header className="pointer-events-auto flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="font-mono-data mb-4 text-xs uppercase tracking-[0.42em] text-cyan-200">
                  Interactive protocol chamber
                </div>
                <h1 className="font-display text-5xl font-extrabold leading-none text-white drop-shadow-[0_0_30px_rgba(34,211,238,0.16)] sm:text-7xl">
                  {labMode === 'dns' ? 'DNS 解析飞行路径' : 'TCP 状态转移走廊'}
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                  输入域名或序列号后，像控制一段网络电影一样播放每一次请求、响应、缓存写入和状态迁移。
                </p>
              </div>
              <div className="flex w-fit rounded-2xl border border-slate-700/50 bg-slate-950/55 p-1 backdrop-blur-md">
                <ModeButton active={labMode === 'dns'} onClick={() => setLabMode('dns')}>
                  DNS
                </ModeButton>
                <ModeButton active={labMode === 'tcp'} onClick={() => setLabMode('tcp')}>
                  TCP
                </ModeButton>
              </div>
            </header>

            <div className="pointer-events-auto mt-6">
              <Timeline
                steps={steps}
                current={index}
                maxSelectableIndex={labMode === 'dns' ? dnsMaxUnlockedIndex : steps.length - 1}
                onSelect={selectTimelineStep}
              />
            </div>
            <div className="pointer-events-auto mt-3 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div className="w-full xl:max-w-[790px]">
                <section className="rounded-2xl border border-slate-700/55 bg-slate-950/54 p-3 shadow-[0_0_34px_rgba(34,211,238,0.08)] backdrop-blur-md">
                <ExperimentInputs
                  labMode={labMode}
                  domain={domain}
                  cacheMatched={Boolean(cachedRecord)}
                  tcpMode={tcpMode}
                  clientSeq={clientSeq}
                  serverSeq={serverSeq}
                  onDomainChange={setDomain}
                  onRunDnsQuery={runDnsQuery}
                  onClearDnsCache={clearDnsCache}
                  onTcpModeChange={setTcpMode}
                  onClientSeqChange={setClientSeq}
                  onServerSeqChange={setServerSeq}
                />
                </section>
              </div>
              <div className="flex shrink-0 justify-start xl:justify-end">
                <PlaybackControls
                  current={index}
                  total={steps.length}
                  playing={playing}
                  speed={speed}
                  onPlayToggle={handlePlayToggle}
                  onNext={next}
                  onPrev={prev}
                  onReset={reset}
                  onSpeedChange={setSpeed}
                  playDisabled={terminalDnsRun}
                  nextDisabled={terminalDnsRun}
                />
              </div>
            </div>

            <div className="mt-10 grid flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="relative min-h-[500px]">
                <div className="pointer-events-none absolute left-0 top-0 rounded-2xl border border-slate-700/60 bg-slate-950/65 px-4 py-3 backdrop-blur-md">
                  <div className="font-mono-data text-xs uppercase tracking-[0.3em] text-slate-500">Now flying</div>
                  <div className="font-display mt-1 text-lg font-bold text-white">{currentStep.packetType}</div>
                </div>
              </div>

              <div className="pointer-events-auto justify-self-end xl:w-[420px]">
                <SimulationInspector step={currentStep} />
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 mx-auto grid max-w-[1500px] gap-5 px-4 py-10 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="flex flex-col gap-5">
            {completionNotice && (
              <section className="rounded-3xl border border-emerald-300/30 bg-emerald-300/10 p-5 shadow-[0_0_40px_rgba(52,211,153,0.12)]">
                <div className="font-display text-2xl font-bold text-white">
                  {completionNotice.mode === 'hit' ? '缓存命中' : '解析完成'}：{completionNotice.domain} {'->'} {completionNotice.ip}
                </div>
                <p className="mt-2 text-sm text-emerald-100/80">
                  {completionNotice.mode === 'hit'
                    ? '本地已有记录，本次不会继续发起递归查询。'
                    : '最终 IP 已返回主机，并写入本地缓存。'}
                </p>
              </section>
            )}

            {labMode === 'dns' && selectedNode && (
              <NodeStatePanel
                node={selectedNode}
                cacheRows={dnsCache}
                currentDomain={normalizedDomain}
                onDeleteRecord={deleteDnsCacheRecord}
                onClose={() => setSelectedNodeId(null)}
              />
            )}
          </div>

          <div className="xl:hidden">
            <SimulationInspector step={currentStep} />
          </div>
        </section>
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
  cacheMatched,
  tcpMode,
  clientSeq,
  serverSeq,
  onDomainChange,
  onRunDnsQuery,
  onClearDnsCache,
  onTcpModeChange,
  onClientSeqChange,
  onServerSeqChange,
}: {
  labMode: LabMode
  domain: string
  cacheMatched: boolean
  tcpMode: TcpMode
  clientSeq: number
  serverSeq: number
  onDomainChange: (value: string) => void
  onRunDnsQuery: () => void
  onClearDnsCache: () => void
  onTcpModeChange: (value: TcpMode) => void
  onClientSeqChange: (value: number) => void
  onServerSeqChange: (value: number) => void
}) {
  if (labMode === 'dns') {
    return (
      <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_auto_auto]">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-300">输入域名</span>
          <input
            value={domain}
            onChange={(event) => onDomainChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 font-mono-data text-sm tracking-normal text-cyan-50 outline-none transition focus:border-cyan-300/80"
          />
        </label>
        <button
          type="button"
          onClick={onRunDnsQuery}
          className={cn(
            'h-11 self-end rounded-xl px-5 text-sm font-bold transition',
            cacheMatched
              ? 'border border-emerald-300/45 bg-emerald-300 text-slate-950 shadow-[0_0_24px_rgba(52,211,153,0.18)]'
              : 'border border-cyan-300/45 bg-cyan-300 text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.18)]',
          )}
        >
          {cacheMatched ? '查看缓存结果' : '开始解析'}
        </button>
        <button
          type="button"
          onClick={onClearDnsCache}
          className="h-11 self-end rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 text-sm font-bold text-slate-300 transition hover:border-rose-300/50 hover:text-rose-100"
        >
          清空缓存
        </button>
      </div>
    )
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[1.45fr_1fr_1fr]">
      <div>
        <span className="mb-1.5 block text-xs font-semibold text-slate-300">连接动作</span>
        <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-700/60 bg-slate-950/60 p-1">
          <button
            type="button"
            onClick={() => onTcpModeChange('handshake')}
            className={cn(
              'inline-flex h-9 items-center justify-center gap-2 rounded-lg text-sm font-bold transition',
              tcpMode === 'handshake' ? 'bg-violet-300 text-slate-950' : 'text-slate-300 hover:text-white',
            )}
          >
            <Link2 className="h-4 w-4" />
            三次握手
          </button>
          <button
            type="button"
            onClick={() => onTcpModeChange('release')}
            className={cn(
              'inline-flex h-9 items-center justify-center gap-2 rounded-lg text-sm font-bold transition',
              tcpMode === 'release' ? 'bg-amber-300 text-slate-950' : 'text-slate-300 hover:text-white',
            )}
          >
            <Unlink className="h-4 w-4" />
            四次挥手
          </button>
        </div>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-slate-300">客户端 Seq</span>
        <input
          type="number"
          value={clientSeq}
          onChange={(event) => onClientSeqChange(Number(event.target.value))}
          className="h-11 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 font-mono-data text-sm text-cyan-50 outline-none transition focus:border-cyan-300/80"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-slate-300">服务器 Seq</span>
        <input
          type="number"
          value={serverSeq}
          onChange={(event) => onServerSeqChange(Number(event.target.value))}
          className="h-11 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 font-mono-data text-sm text-cyan-50 outline-none transition focus:border-cyan-300/80"
        />
      </label>
    </div>
  )
}

function NodeStatePanel({
  node,
  cacheRows,
  currentDomain,
  onDeleteRecord,
  onClose,
}: {
  node: TopologyNode
  cacheRows: DnsCacheRecord[]
  currentDomain: string
  onDeleteRecord: (domain: string) => void
  onClose: () => void
}) {
  const domainParts = currentDomain.split('.').filter(Boolean)
  const tld = domainParts.length > 0 ? `.${domainParts[domainParts.length - 1]}` : '.com'
  const registeredDomain = domainParts.length >= 2
    ? `${domainParts[domainParts.length - 2]}.${domainParts[domainParts.length - 1]}`
    : currentDomain

  return (
    <section className="glass-panel rounded-3xl p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="font-mono-data mb-2 text-xs uppercase tracking-[0.32em] text-cyan-200">
            selected node
          </div>
          <h2 className="font-display text-2xl font-bold text-white">{node.label}</h2>
          <p className="mt-1 text-sm text-slate-400">{node.role}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-cyan-300/50 hover:text-white"
        >
          Close
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <NodeMetric label="Node type" value={node.kind ?? 'unknown'} />
        <NodeMetric label="Current domain" value={currentDomain} />
        {node.kind === 'dns-root' && <NodeMetric label="Delegation record" value={`${tld} -> ${tld} TLD DNS`} />}
        {node.kind === 'dns-tld' && <NodeMetric label="Delegation record" value={`${registeredDomain} -> ${registeredDomain} DNS`} />}
        {node.kind === 'dns-authority' && <NodeMetric label="Zone record" value={`${currentDomain} A ${resolveDnsIp(currentDomain)}`} />}
        {node.kind === 'network' && <NodeMetric label="Data path" value="client -> routers/ISP -> web server" />}
      </div>

      {(node.kind === 'client' || node.kind === 'cache' || node.kind === 'resolver') && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/45">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.16em] text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Domain</th>
                <th className="px-4 py-3 font-medium">IP</th>
                <th className="px-4 py-3 font-medium">TTL</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {cacheRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-5 text-center text-slate-500">
                    No cached DNS records on this node yet.
                  </td>
                </tr>
              ) : (
                cacheRows.map((row) => (
                  <tr key={`${node.id}-${row.domain}`} className="border-t border-slate-800/80">
                    <td className="font-mono-data px-4 py-3 text-cyan-50">{row.domain}</td>
                    <td className="font-mono-data px-4 py-3 text-emerald-100">{row.ip}</td>
                    <td className="font-mono-data px-4 py-3 text-slate-300">{row.ttl}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteRecord(row.domain)}
                        className="rounded-xl border border-rose-300/30 bg-rose-300/10 px-3 py-1 text-xs font-bold text-rose-100 transition hover:bg-rose-300/20"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function NodeMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="font-mono-data mt-2 break-words text-sm text-cyan-50">{value}</div>
    </div>
  )
}
