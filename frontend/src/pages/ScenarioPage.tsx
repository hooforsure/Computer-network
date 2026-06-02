import { AppShell } from '../components/AppShell'

export function ScenarioPage() {
  return (
    <AppShell title="Scenario">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center px-5 py-10">
        <div className="glass-panel rounded-3xl p-8">
          <div className="font-mono-data mb-4 text-xs uppercase tracking-[0.35em] text-amber-200">Coming next</div>
          <h1 className="font-display text-4xl font-bold text-white">Integrated web visit scenario</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            This chamber will simulate H1 visiting www.abc.com from t0 to t1, including ARP, DNS, TCP, HTTP preparation,
            switch MAC learning, ARP table updates, and route highlighting.
          </p>
        </div>
      </section>
    </AppShell>
  )
}
