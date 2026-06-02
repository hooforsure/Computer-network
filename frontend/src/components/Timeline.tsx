import { cn } from '../lib/classNames'
import type { SimulationStep } from '../types/simulation'

interface TimelineProps {
  steps: SimulationStep[]
  current: number
  onSelect: (index: number) => void
}

export function Timeline({ steps, current, onSelect }: TimelineProps) {
  return (
    <div className="glass-panel rounded-3xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono-data text-xs uppercase tracking-[0.3em] text-slate-400">Timeline</span>
        <span className="text-xs text-slate-500">Click any step to scrub the experiment</span>
      </div>
      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        {steps.map((step, index) => (
          <button
            key={step.id}
            type="button"
            onClick={() => onSelect(index)}
            className={cn(
              'rounded-2xl border p-3 text-left transition',
              index === current
                ? 'border-cyan-300/80 bg-cyan-300/15 shadow-[0_0_24px_rgba(34,211,238,0.18)]'
                : 'border-slate-800 bg-slate-950/40 hover:border-slate-600',
            )}
          >
            <div className="font-mono-data text-[11px] text-slate-500">{String(index + 1).padStart(2, '0')}</div>
            <div className="mt-1 line-clamp-2 text-sm font-semibold text-slate-100">{step.title}</div>
            <div className="font-mono-data mt-2 text-[11px] text-cyan-200">{step.packetType}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
