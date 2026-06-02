import { ArrowLeft, Atom, BookOpen, Network } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { cn } from '../lib/classNames'

const links = [
  { to: '/protocol-lab', label: 'Protocol Lab', icon: Atom },
  { to: '/scenario', label: 'Scenario', icon: Network },
  { to: '/knowledge', label: 'Knowledge', icon: BookOpen },
]

export function AppShell({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <main className="min-h-screen bg-[#05070d] text-slate-50">
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-slate-700/20 bg-[#05070d]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200">
            <ArrowLeft className="h-4 w-4" />
            Gateway
          </Link>
          <div className="hidden items-center gap-2 md:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition',
                    isActive
                      ? 'border-cyan-300/60 bg-cyan-300/10 text-cyan-100'
                      : 'border-slate-700/40 bg-slate-900/30 text-slate-300 hover:border-slate-500/70',
                  )
                }
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </NavLink>
            ))}
          </div>
          <div className="font-mono-data text-xs uppercase tracking-[0.28em] text-cyan-200">{title}</div>
        </div>
      </header>
      <div className="pt-16">{children}</div>
    </main>
  )
}
