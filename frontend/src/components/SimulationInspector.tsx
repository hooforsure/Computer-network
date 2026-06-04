import type { SimulationStep } from '../types/simulation'
import { cn } from '../lib/classNames'

const tcpStates = [
  'CLOSED',
  'LISTEN',
  'SYN-SENT',
  'SYN-RECEIVED',
  'ESTABLISHED',
  'FIN-WAIT-1',
  'FIN-WAIT-2',
  'CLOSE-WAIT',
  'LAST-ACK',
  'TIME-WAIT',
]

export function SimulationInspector({ step }: { step: SimulationStep }) {
  const fieldRows = Object.entries(step.packetFields)

  return (
    <aside className="glass-panel scanline h-full overflow-hidden rounded-3xl p-5">
      <div className="mb-5">
        <div className="font-mono-data mb-2 text-xs uppercase tracking-[0.3em] text-cyan-200">
          {step.protocol} / {step.packetType}
        </div>
        <h2 className="font-display text-2xl font-bold text-slate-50">{step.title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">{step.explanation}</p>
      </div>

      {step.result && (
        <section
          className={cn(
            'mb-5 rounded-2xl border p-4',
            resultTone(step.result.tone),
          )}
        >
          <div className="font-mono-data text-xs uppercase tracking-[0.28em] opacity-80">{step.result.label}</div>
          <div className="font-display mt-2 break-words text-xl font-bold text-white">{step.result.value}</div>
        </section>
      )}

      <section className="mb-5 rounded-2xl border border-slate-700/40 bg-slate-950/40 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-100">Packet inspector</h3>
          <span className="font-mono-data rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-1 text-[10px] text-cyan-100">
            {step.fromNode} {'->'} {step.toNode}
          </span>
        </div>
        <div className="space-y-2.5">
          {fieldRows.map(([key, value]) => (
            <div key={key} className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-center gap-3 rounded-xl border border-slate-800/70 bg-slate-950/35 px-3 py-2 text-sm">
              <span className="truncate text-slate-400">{key}</span>
              <span className="font-mono-data break-words text-right text-cyan-100">{String(value ?? '-')}</span>
            </div>
          ))}
        </div>
      </section>

      {(step.clientState || step.serverState) && (
        <section className="mb-5 rounded-2xl border border-slate-700/40 bg-slate-950/40 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-100">TCP state tracker</h3>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-violet-300/20 bg-violet-300/10 p-4">
              <div className="text-xs text-violet-200">Client state</div>
              <div className="font-mono-data mt-2 text-sm text-white">{step.clientState ?? '-'}</div>
            </div>
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
              <div className="text-xs text-cyan-200">Server state</div>
              <div className="font-mono-data mt-2 text-sm text-white">{step.serverState ?? '-'}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {tcpStates.map((state) => {
              const active = state === step.clientState || state === step.serverState
              return (
                <span
                  key={state}
                  className={cn(
                    'font-mono-data rounded-full border px-2.5 py-1 text-[10px]',
                    active
                      ? 'border-cyan-300/70 bg-cyan-300/15 text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.16)]'
                      : 'border-slate-800 bg-slate-950/40 text-slate-500',
                  )}
                >
                  {state}
                </span>
              )
            })}
          </div>
        </section>
      )}

      {step.tables?.map((table) => (
        <section key={table.label} className="mb-5 rounded-2xl border border-slate-700/40 bg-slate-950/40 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-100">{table.label}</h3>
          <div className="overflow-hidden rounded-xl border border-slate-800">
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
                    <td colSpan={table.columns.length} className="px-3 py-3 text-center text-slate-500">
                      Empty
                    </td>
                  </tr>
                ) : (
                  table.rows.map((row, index) => (
                    <tr key={`${table.label}-${index}`} className="border-t border-slate-800/80">
                      {table.columns.map((column) => (
                        <td key={column} className="font-mono-data px-2 py-2 text-[11px] text-cyan-50">
                          {row[column]}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {step.teachingPoints && step.teachingPoints.length > 0 && (
        <section className="mb-5 rounded-2xl border border-slate-700/40 bg-slate-950/40 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-100">Concept notes</h3>
          <div className="space-y-2">
            {step.teachingPoints.map((point) => (
              <div key={point} className="flex gap-2 text-sm leading-6 text-slate-300">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-700/40 bg-slate-950/40 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-100">Execution log</h3>
        <p className="font-mono-data text-xs leading-5 text-emerald-200">{step.log}</p>
      </section>
    </aside>
  )
}

type ResultTone = NonNullable<SimulationStep['result']>['tone']

function resultTone(tone: ResultTone) {
  switch (tone) {
    case 'emerald':
      return 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100'
    case 'amber':
      return 'border-amber-300/30 bg-amber-300/10 text-amber-100'
    case 'violet':
      return 'border-violet-300/30 bg-violet-300/10 text-violet-100'
    case 'rose':
      return 'border-rose-300/30 bg-rose-300/10 text-rose-100'
    default:
      return 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100'
  }
}
