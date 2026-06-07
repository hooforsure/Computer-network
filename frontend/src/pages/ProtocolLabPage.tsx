import { useEffect, useMemo, useState } from 'react'
import { Link2, RotateCcw, SkipBack, SkipForward, Unlink } from 'lucide-react'
import { useCallback } from 'react'
import { AppShell } from '../components/AppShell'
import { NetworkScene } from '../components/NetworkScene'
import { PlaybackControls } from '../components/PlaybackControls'
import { SimulationInspector } from '../components/SimulationInspector'
import { Timeline } from '../components/Timeline'
import { ModuleSignalHeading } from '../components/VisualEffects'
import {
  clearHostDnsCacheApi,
  clearResolverDnsCacheApi,
  commitDnsResolution as commitDnsResolutionApi,
  fetchDnsCache,
  fetchHostDnsCache,
  fetchTcpSteps,
  resolveDns,
} from '../api/netverseApi'
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
import type { SimulationStep } from '../types/simulation'
import type { TopologyNode } from '../types/simulation'

type LabMode = 'dns' | 'tcp'
type TcpMode = 'handshake' | 'release'
type DnsRunStatus = 'idle' | 'running' | 'cache-hit' | 'completed' | 'reset'
type DnsCacheLayer = 'host' | 'resolver' | 'miss'

export function ProtocolLabPage() {
  const [labMode, setLabMode] = useState<LabMode>('dns')
  const [domain, setDomain] = useState('')
  const [dnsCache, setDnsCache] = useState<DnsCacheRecord[]>([])
  const [hostDnsCache, setHostDnsCache] = useState<DnsCacheRecord[]>([])
  const [activeDnsRecord, setActiveDnsRecord] = useState<DnsCacheRecord | undefined>(undefined)
  const [dnsRun, setDnsRun] = useState(0)
  const [dnsRunStatus, setDnsRunStatus] = useState<DnsRunStatus>('idle')
  const [dnsMaxUnlockedIndex, setDnsMaxUnlockedIndex] = useState(0)
  const [committedDnsRun, setCommittedDnsRun] = useState<number | null>(null)
  const [focusNonce, setFocusNonce] = useState(0)
  const [tcpMode, setTcpMode] = useState<TcpMode>('handshake')
  const [clientSeq, setClientSeq] = useState(1000)
  const [serverSeq, setServerSeq] = useState(5000)
  const [index, setIndex] = useState(0)
  const [apiSteps, setApiSteps] = useState<SimulationStep[] | null>(null)
  const [confirmedCacheHitDomain, setConfirmedCacheHitDomain] = useState<string | null>(null)
  const [dnsRunLocked, setDnsRunLocked] = useState(false)
  const [dnsCacheLayer, setDnsCacheLayer] = useState<DnsCacheLayer | null>(null)
  const [resolvedDnsIp, setResolvedDnsIp] = useState<string | null>(null)
  const normalizedDomain = normalizeDomain(domain)
  const currentRunCacheHit = Boolean(domain.trim() && confirmedCacheHitDomain === normalizedDomain)
  const runCachedRecord = activeDnsRecord?.domain === normalizedDomain ? activeDnsRecord : undefined

  const steps = useMemo(() => {
    if (apiSteps) return apiSteps
    if (labMode === 'dns' && dnsRunStatus === 'idle') return [createDnsIdleStep(domain, dnsCache)]
    if (labMode === 'dns') return createDnsSteps(domain, { cachedRecord: runCachedRecord, cacheRows: dnsCache })
    return tcpMode === 'handshake'
      ? createTcpHandshakeSteps(clientSeq, serverSeq)
      : createTcpReleaseSteps(clientSeq, serverSeq)
  }, [apiSteps, clientSeq, dnsCache, dnsRunStatus, domain, labMode, runCachedRecord, serverSeq, tcpMode])

  const topology: TopologyNode[] = labMode === 'dns' ? createDnsTopology(domain) : tcpTopology
  const currentStep = steps[Math.min(index, steps.length - 1)]

  const refreshDnsCaches = useCallback(() => {
    fetchDnsCache()
      .then((rows) => setDnsCache(rows.map((row) => ({ domain: row.domain, ip: row.ip, ttl: row.ttl, source: row.source }))))
      .catch(() => {})
    fetchHostDnsCache()
      .then((rows) => setHostDnsCache(rows.map((row) => ({ domain: row.domain, ip: row.ip, ttl: row.ttl, source: row.source }))))
      .catch(() => {})
  }, [])

  const commitDnsResolution = useCallback(async () => {
    if (dnsCacheLayer === 'host') {
      setCommittedDnsRun(dnsRun)
      setDnsRunStatus('completed')
      setDnsRunLocked(false)
      return
    }
    const ip = resolvedDnsIp ?? resolveDnsIp(normalizedDomain)
    const nextRecord = {
      domain: normalizedDomain,
      ip,
      ttl: '300s',
      source: 'resolver',
    }
    try {
      await commitDnsResolutionApi(normalizedDomain)
      setDnsCache((rows) => upsertCacheRow(rows, nextRecord))
      setHostDnsCache((rows) => upsertCacheRow(rows, { ...nextRecord, source: 'browser' }))
      refreshDnsCaches()
    } finally {
      setCommittedDnsRun(dnsRun)
      setDnsRunStatus('completed')
      setDnsRunLocked(false)
    }
  }, [dnsCacheLayer, dnsRun, normalizedDomain, refreshDnsCaches, resolvedDnsIp])

  useEffect(() => {
    refreshDnsCaches()
  }, [refreshDnsCaches])

  useEffect(() => {
    if (labMode !== 'tcp') return
    fetchTcpSteps(tcpMode, clientSeq, serverSeq)
      .then(setApiSteps)
      .catch(() => setApiSteps(null))
  }, [clientSeq, labMode, serverSeq, tcpMode])

  function next() {
    if (labMode === 'dns' && dnsRunStatus === 'idle') {
      beginDnsRun()
      return
    }
    const nextIndex = Math.min(index + 1, steps.length - 1)
    setIndex(nextIndex)
    if (labMode === 'dns') {
      setDnsMaxUnlockedIndex((max) => Math.max(max, nextIndex))
      setFocusNonce((nonce) => nonce + 1)
      completeDnsRunAt(nextIndex)
    }
  }

  function prev() {
    setIndex((value) => Math.max(value - 1, 0))
    setFocusNonce((nonce) => nonce + 1)
  }

  function reset() {
    setIndex(0)
    if (labMode === 'dns') {
      setActiveDnsRecord(undefined)
      setDnsRunStatus('reset')
      setDnsMaxUnlockedIndex(0)
      setConfirmedCacheHitDomain(null)
      setDnsCacheLayer(null)
      setResolvedDnsIp(null)
      setCommittedDnsRun(null)
      setDnsRunLocked(false)
      setDnsRun((value) => value + 1)
      setFocusNonce((nonce) => nonce + 1)
    }
  }

  async function runDnsQuery() {
    setLabMode('dns')
    if (dnsRunLocked) return
    const queryDomain = domain.trim() || 'www.abc.com'
    const normalizedQueryDomain = normalizeDomain(queryDomain)
    let unlockAfterResponse = false
    if (!domain.trim()) setDomain(queryDomain)
    setDnsRunLocked(true)
    try {
      const response = await resolveDns(queryDomain)
      setApiSteps(response.steps)
      setDnsRunStatus(response.cacheHit ? 'cache-hit' : 'running')
      setDnsMaxUnlockedIndex(Math.max(0, response.steps.length - 1))
      setConfirmedCacheHitDomain(response.cacheHit ? response.domain : null)
      setDnsCacheLayer(response.cacheLayer)
      setResolvedDnsIp(response.ip)
      unlockAfterResponse = response.cacheHit
    } catch {
      const record = dnsCache.find((row) => row.domain === normalizedQueryDomain)
      setApiSteps(null)
      setActiveDnsRecord(record)
      setDnsRunStatus(record ? 'cache-hit' : 'running')
      setDnsMaxUnlockedIndex(record ? 0 : 1)
      setConfirmedCacheHitDomain(record ? record.domain : null)
      setDnsCacheLayer(record ? 'resolver' : 'miss')
      setResolvedDnsIp(record?.ip ?? resolveDnsIp(normalizedQueryDomain))
      unlockAfterResponse = true
    } finally {
      setDnsRun((value) => value + 1)
      setIndex(0)
      setFocusNonce((nonce) => nonce + 1)
      if (unlockAfterResponse) setDnsRunLocked(false)
    }
  }

  function beginDnsRun() {
    if (labMode !== 'dns') return
    runDnsQuery()
  }

  function selectTimelineStep(nextIndex: number) {
    if (labMode === 'dns' && nextIndex > dnsMaxUnlockedIndex) return
    setIndex(nextIndex)
    completeDnsRunAt(nextIndex)
  }

  function completeDnsRunAt(nextIndex: number) {
    if (labMode !== 'dns') return
    if (steps[Math.min(nextIndex, steps.length - 1)]?.id !== 'dns-10') return
    if (committedDnsRun === dnsRun) return
    void commitDnsResolution()
  }

  function deleteDnsCacheRecord(domainToDelete: string) {
    setDnsCache((rows) => rows.filter((row) => row.domain !== domainToDelete))
    if (activeDnsRecord?.domain === domainToDelete) setActiveDnsRecord(undefined)
    if (normalizeDomain(domain) === domainToDelete) {
      setDnsRunStatus('idle')
      setDnsMaxUnlockedIndex(0)
      setConfirmedCacheHitDomain(null)
      setDnsRun((value) => value + 1)
    }
  }

  async function clearHostDnsCache() {
    await clearHostDnsCacheApi()
    setHostDnsCache([])
    resetDnsRunState()
    refreshDnsCaches()
  }

  async function clearResolverDnsCache() {
    await clearResolverDnsCacheApi()
    setDnsCache([])
    resetDnsRunState()
    refreshDnsCaches()
  }

  function resetDnsRunState() {
    setActiveDnsRecord(undefined)
    setConfirmedCacheHitDomain(null)
    setDnsCacheLayer(null)
    setResolvedDnsIp(null)
    setCommittedDnsRun(null)
    setDnsRunStatus('idle')
    setDnsMaxUnlockedIndex(0)
    setDnsRunLocked(false)
    setApiSteps(null)
    setIndex(0)
    setDnsRun((value) => value + 1)
  }

  function switchLabMode(nextMode: LabMode) {
    setLabMode(nextMode)
    setIndex(0)
    setFocusNonce((nonce) => nonce + 1)
  }

  function changeTcpMode(nextMode: TcpMode) {
    setTcpMode(nextMode)
    setApiSteps(null)
    setIndex(0)
    setFocusNonce((nonce) => nonce + 1)
  }

  function changeClientSeq(value: number) {
    setClientSeq(value)
    setApiSteps(null)
    setIndex(0)
  }

  function changeServerSeq(value: number) {
    setServerSeq(value)
    setApiSteps(null)
    setIndex(0)
  }

  const terminalDnsRun = labMode === 'dns' && (
    dnsRunLocked && index >= steps.length - 1
  )
  const dnsControlsLocked = labMode === 'dns' && dnsRunLocked

  return (
    <AppShell title="Protocol Lab">
      <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-[#05070d]">
        <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
          <div className="absolute inset-x-0 bottom-0 top-[19rem] sm:top-[18.5rem] xl:top-[17.5rem]">
            <NetworkScene
              nodes={topology}
              step={currentStep}
              focusNonce={focusNonce}
              sceneOffset={labMode === 'dns' ? [-1.72, -1.08, 0] : undefined}
              nodeLabelOffset={labMode === 'dns' ? 0.78 : undefined}
              htmlNodeLabels={labMode === 'dns'}
            />
          </div>
          <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_42%_56%,transparent_0%,rgba(5,7,13,0.08)_48%,rgba(5,7,13,0.74)_100%)]" />
          <div className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(90deg,rgba(5,7,13,0.86)_0%,rgba(5,7,13,0.36)_26%,transparent_55%,rgba(5,7,13,0.66)_100%)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-48 bg-gradient-to-t from-[#05070d] via-[#05070d]/62 to-transparent" />

          <div className="pointer-events-none relative z-10 flex min-h-[calc(100vh-4rem)] w-full flex-col px-6 py-8 xl:px-12">
            <header className="pointer-events-auto flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <ModuleSignalHeading
                eyebrow="Interactive protocol chamber"
                title={labMode === 'dns' ? 'DNS resolution flight path' : 'TCP state transition corridor'}
                description="Enter a domain or sequence numbers, then play each request, response, cache write, and state transition like a controllable network film."
                accent={labMode === 'dns' ? 'cyan' : 'violet'}
                glitch={labMode === 'tcp'}
              />
              <div className="flex w-fit rounded-2xl border border-slate-700/50 bg-slate-950/55 p-1 backdrop-blur-md">
                <ModeButton active={labMode === 'dns'} onClick={() => switchLabMode('dns')}>
                  DNS
                </ModeButton>
                <ModeButton active={labMode === 'tcp'} onClick={() => switchLabMode('tcp')}>
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
            <section className="pointer-events-auto mt-3 flex flex-col gap-4 rounded-[1.65rem] border border-slate-700/45 bg-slate-950/54 p-3 shadow-[0_0_34px_rgba(34,211,238,0.08)] backdrop-blur-md xl:flex-row xl:items-end xl:justify-between">
              <div className="w-full xl:max-w-[780px]">
                <ExperimentInputs
                  labMode={labMode}
                  domain={domain}
                  cacheMatched={currentRunCacheHit}
                  dnsRunLocked={dnsControlsLocked}
                  tcpMode={tcpMode}
                  clientSeq={clientSeq}
                  serverSeq={serverSeq}
                  onDomainChange={(value) => {
                    if (dnsRunLocked) return
                    setDomain(value)
                    setApiSteps(null)
                    setActiveDnsRecord(undefined)
                    setDnsRunStatus('idle')
                    setDnsMaxUnlockedIndex(0)
                    setIndex(0)
                    setDnsRun((run) => run + 1)
                  }}
                  onRunDnsQuery={runDnsQuery}
                  current={index}
                  onNext={next}
                  onPrev={prev}
                  onReset={reset}
                  nextDisabled={terminalDnsRun}
                  onTcpModeChange={changeTcpMode}
                  onClientSeqChange={changeClientSeq}
                  onServerSeqChange={changeServerSeq}
                />
              </div>
              {labMode === 'tcp' && (
                <>
                  <div className="h-px bg-slate-700/45 xl:h-14 xl:w-px" />
                  <div className="flex shrink-0 justify-start xl:justify-end">
                <PlaybackControls
                  current={index}
                  onNext={next}
                  onPrev={prev}
                  onReset={reset}
                />
                  </div>
                </>
              )}
            </section>

            <div className="mt-10 grid flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="relative min-h-[500px]" />

              <div className="pointer-events-auto justify-self-end xl:w-[420px]">
                <SimulationInspector step={currentStep} />
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 mx-auto max-w-[1500px] px-4 py-10">
          <div className="grid gap-5 xl:grid-cols-2">
            {labMode === 'dns' && (
              <>
                <DnsCacheTablePanel
                  kind="host"
                  cacheRows={hostDnsCache}
                  onClear={clearHostDnsCache}
                />
                <DnsCacheTablePanel
                  kind="resolver"
                  cacheRows={dnsCache}
                  onClear={clearResolverDnsCache}
                  onDeleteRecord={deleteDnsCacheRecord}
                />
              </>
            )}
          </div>

          <div className="mt-5 xl:hidden">
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
  dnsRunLocked,
  tcpMode,
  clientSeq,
  serverSeq,
  onDomainChange,
  onRunDnsQuery,
  current,
  onNext,
  onPrev,
  onReset,
  nextDisabled,
  onTcpModeChange,
  onClientSeqChange,
  onServerSeqChange,
}: {
  labMode: LabMode
  domain: string
  cacheMatched: boolean
  dnsRunLocked: boolean
  tcpMode: TcpMode
  clientSeq: number
  serverSeq: number
  onDomainChange: (value: string) => void
  onRunDnsQuery: () => void
  current: number
  onNext: () => void
  onPrev: () => void
  onReset: () => void
  nextDisabled: boolean
  onTcpModeChange: (value: TcpMode) => void
  onClientSeqChange: (value: number) => void
  onServerSeqChange: (value: number) => void
}) {
  if (labMode === 'dns') {
    return (
      <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_auto_auto_auto_auto]">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-300">输入域名</span>
          <input
            value={domain}
            placeholder="www.abc.com"
            disabled={dnsRunLocked}
            onChange={(event) => onDomainChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 font-mono-data text-sm tracking-normal text-cyan-50 outline-none transition focus:border-cyan-300/80 disabled:cursor-not-allowed disabled:text-slate-500"
          />
        </label>
        <button
          type="button"
          onClick={onRunDnsQuery}
          disabled={dnsRunLocked}
          className={cn(
            'h-11 self-end rounded-xl border px-5 text-sm font-bold shadow-[0_0_24px_rgba(34,211,238,0.18)] transition',
            cacheMatched
              ? 'cursor-not-allowed border-emerald-300/45 bg-emerald-300 text-slate-950 shadow-[0_0_24px_rgba(52,211,153,0.18)]'
              : dnsRunLocked
                ? 'cursor-not-allowed border-slate-700/55 bg-slate-800 text-slate-400 shadow-none'
                : 'border-cyan-300/45 bg-cyan-300 text-slate-950 hover:bg-cyan-200',
          )}
        >
          {cacheMatched ? '缓存命中' : dnsRunLocked ? '解析中' : '开始解析'}
        </button>
        <button
          type="button"
          onClick={onPrev}
          disabled={current <= 0}
          className="inline-flex h-11 w-12 items-center justify-center self-end rounded-xl border border-slate-700/55 bg-slate-950/50 text-slate-100 transition hover:border-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="上一步"
        >
          <SkipBack className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="inline-flex h-11 w-12 items-center justify-center self-end rounded-xl border border-slate-700/55 bg-slate-950/50 text-slate-100 transition hover:border-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="下一步"
        >
          <SkipForward className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-11 w-12 items-center justify-center self-end rounded-xl border border-slate-700/55 bg-slate-950/50 text-slate-100 transition hover:border-rose-300/60"
          aria-label="閲嶇疆"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
      </div>
    )
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[1.45fr_1fr_1fr]">
      <div>
        <span className="mb-1.5 block text-xs font-semibold text-slate-300">Connection action</span>
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
            3-way handshake
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
            4-way release
          </button>
        </div>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-slate-300">Client Seq</span>
        <input
          type="number"
          value={clientSeq}
          onChange={(event) => onClientSeqChange(Number(event.target.value))}
          className="h-11 w-full rounded-xl border border-slate-700/60 bg-slate-950/60 px-4 font-mono-data text-sm text-cyan-50 outline-none transition focus:border-cyan-300/80"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-slate-300">Server Seq</span>
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

function DnsCacheTablePanel({
  kind,
  cacheRows,
  onClear,
  onDeleteRecord,
}: {
  kind: 'host' | 'resolver'
  cacheRows: DnsCacheRecord[]
  onClear: () => void
  onDeleteRecord?: (domain: string) => void
}) {
  const showsResolverCache = kind === 'resolver'
  const title = showsResolverCache ? '本地 DNS 服务器缓存表' : '主机侧缓存表'
  const eyebrow = showsResolverCache ? 'LOCAL DNS RESOLVER' : 'HOST SIDE CACHE'
  const description = showsResolverCache
    ? '来自后端 dns_cache，表示本地 DNS 服务器递归解析后的缓存。'
    : '来自后端 host_dns_cache，表示浏览器缓存、OS DNS 缓存或 Hosts。'
  const emptyText = showsResolverCache ? '本地 DNS 服务器缓存暂无记录。' : '主机侧缓存暂无记录。'

  return (
    <section className="border border-slate-800/80 bg-slate-950/72 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="font-mono-data mb-2 text-xs uppercase tracking-[0.28em] text-cyan-200">
            {eyebrow}
          </div>
          <h2 className="font-display text-2xl font-bold text-white">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-cyan-300/50 hover:text-white"
        >
          Clear
        </button>
      </div>

      <div className="max-h-[520px] overflow-y-auto overflow-x-hidden border-y border-slate-800">
        {cacheRows.length === 0 ? (
          <div className="px-4 py-5 text-center text-sm text-slate-500">
            {emptyText}
          </div>
        ) : (
          cacheRows.map((row) => (
            <div
              key={`${kind}-${row.domain}`}
              className="border-t border-slate-800/80 px-4 py-4 first:border-t-0"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Domain</div>
                  <div className="font-mono-data mt-1 min-w-0 [overflow-wrap:anywhere] text-sm leading-5 text-cyan-50">
                    {row.domain}
                  </div>
                </div>
                {showsResolverCache && (
                  <button
                    type="button"
                    onClick={() => onDeleteRecord?.(row.domain)}
                    className="shrink-0 rounded-xl border border-rose-300/30 bg-rose-300/10 px-3 py-1 text-xs font-bold text-rose-100 transition hover:bg-rose-300/20"
                  >
                    Delete
                  </button>
                )}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <CacheCell label="IP" value={row.ip} className="text-emerald-100" />
                <CacheCell label="TTL" value={row.ttl} className="text-slate-300" />
                <CacheCell label="Source" value={row.source} className="text-slate-300" />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

function CacheCell({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="min-w-0">
      <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <span className={cn('font-mono-data block min-w-0 [overflow-wrap:anywhere] text-sm tracking-normal', className)}>
        {value}
      </span>
    </div>
  )
}
