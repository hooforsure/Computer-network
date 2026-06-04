import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { GooeyNav } from './VisualEffects'

export function AppShell({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <main className="min-h-screen bg-[#05070d] text-slate-50">
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-slate-700/20 bg-[#05070d]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200">
            <ArrowLeft className="h-4 w-4" />
            Gateway
          </Link>
          <GooeyNav className="hidden md:block" />
          <div className="font-mono-data text-xs uppercase tracking-[0.28em] text-cyan-200">{title}</div>
        </div>
      </header>
      <div className="pt-16">{children}</div>
    </main>
  )
}
