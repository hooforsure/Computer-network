import type { SimulationStep } from '../types/simulation'

export function SimulationInspector({ step }: { step: SimulationStep }) {
  const fieldRows = Object.entries(step.packetFields)

  return (
    <aside className="glass-panel scanline h-full rounded-3xl p-5">
      <div className="mb-5">
        <div className="font-mono-data mb-2 text-xs uppercase tracking-[0.3em] text-cyan-200">
          {step.protocol} / {step.packetType}
        </div>
        <h2 className="font-display text-2xl font-bold text-slate-50">{step.title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">{step.explanation}</p>
      </div>

      <section className="mb-5 rounded-2xl border border-slate-700/40 bg-slate-950/40 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-100">Packet fields</h3>
        <div className="space-y-2">
          {fieldRows.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-400">{key}</span>
              <span className="font-mono-data text-right text-cyan-100">{String(value ?? '-')}</span>
            </div>
          ))}
        </div>
      </section>

      {(step.clientState || step.serverState) && (
        <section className="mb-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-violet-300/20 bg-violet-300/10 p-4">
            <div className="text-xs text-violet-200">Client state</div>
            <div className="font-mono-data mt-2 text-sm text-white">{step.clientState ?? '-'}</div>
          </div>
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
            <div className="text-xs text-cyan-200">Server state</div>
            <div className="font-mono-data mt-2 text-sm text-white">{step.serverState ?? '-'}</div>
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
        </section>
      ))}

      <section className="rounded-2xl border border-slate-700/40 bg-slate-950/40 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-100">Execution log</h3>
        <p className="font-mono-data text-xs leading-5 text-emerald-200">{step.log}</p>
      </section>
    </aside>
  )
}
