import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { GlobalAudioControl } from './components/GlobalAudioControl'

const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })))
const KnowledgeAtlasPage = lazy(() => import('./pages/KnowledgeAtlasPage').then((module) => ({ default: module.KnowledgeAtlasPage })))
const ProtocolLabPage = lazy(() => import('./pages/ProtocolLabPage').then((module) => ({ default: module.ProtocolLabPage })))
const ScenarioPage = lazy(() => import('./pages/ScenarioPage').then((module) => ({ default: module.ScenarioPage })))

export default function App() {
  return (
    <>
      <GlobalAudioControl />
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/protocol-lab" element={<ProtocolLabPage />} />
          <Route path="/scenario" element={<ScenarioPage />} />
          <Route path="/knowledge" element={<KnowledgeAtlasPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}

function RouteLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#05070d] text-cyan-100">
      <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-900">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-cyan-300" />
      </div>
    </main>
  )
}
