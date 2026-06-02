import { Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { KnowledgeAtlasPage } from './pages/KnowledgeAtlasPage'
import { ProtocolLabPage } from './pages/ProtocolLabPage'
import { ScenarioPage } from './pages/ScenarioPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/protocol-lab" element={<ProtocolLabPage />} />
      <Route path="/scenario" element={<ScenarioPage />} />
      <Route path="/knowledge" element={<KnowledgeAtlasPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
