import { AppShell } from '../components/AppShell'

export function KnowledgeAtlasPage() {
  return (
    <AppShell title="Knowledge">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center px-5 py-10">
        <div className="glass-panel rounded-3xl p-8">
          <div className="font-mono-data mb-4 text-xs uppercase tracking-[0.35em] text-emerald-200">Coming next</div>
          <h1 className="font-display text-4xl font-bold text-white">TCP/IP knowledge atlas</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            This chamber will turn the TCP/IP five-layer model into a database-backed knowledge graph with search,
            pagination, CRUD, and clickable concept details.
          </p>
        </div>
      </section>
    </AppShell>
  )
}
