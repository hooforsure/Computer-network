import { cn } from '../lib/classNames'
import type { SimulationStep } from '../types/simulation'

interface TimelineProps {
  steps: SimulationStep[]
  current: number
  maxSelectableIndex?: number
  onSelect: (index: number) => void
}

export function Timeline({ steps, current, maxSelectableIndex = steps.length - 1, onSelect }: TimelineProps) {
  return (
    <div className="timeline-console rounded-3xl border border-slate-700/35 bg-slate-950/42 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono-data text-xs uppercase tracking-[0.3em] text-slate-400">流程时间线</span>
      </div>
      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        {steps.map((step, index) => {
          const locked = index > maxSelectableIndex
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => {
                if (!locked) onSelect(index)
              }}
              disabled={locked}
              style={{ '--step-accent': protocolAccent(step.protocol, step.packetType) } as React.CSSProperties}
              className={cn(
                'timeline-step rounded-2xl border p-3 text-left transition',
                index === current
                  ? 'timeline-step-active border-[color:var(--step-accent)] bg-cyan-300/15 shadow-[0_0_24px_rgba(34,211,238,0.18)]'
                  : locked
                    ? 'cursor-not-allowed border-slate-900 bg-slate-950/25 opacity-35'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-600',
              )}
            >
              <div className="font-mono-data text-[11px] text-slate-500">{String(index + 1).padStart(2, '0')}</div>
              <div className="mt-1 line-clamp-2 text-sm font-semibold text-slate-100">{step.title}</div>
              <div className="font-mono-data mt-2 text-[11px] text-cyan-200">{locked ? '未解锁' : step.packetType}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function protocolAccent(protocol: string, packetType: string) {
  const text = `${protocol} ${packetType}`.toUpperCase()
  if (text.includes('ARP')) return '#34d399'
  if (text.includes('HTTP')) return '#f59e0b'
  if (text.includes('TCP') || text.includes('SYN') || text.includes('ACK') || text.includes('FIN')) return '#8b5cf6'
  if (text.includes('DNS')) return '#22d3ee'
  return '#67e8f9'
}
