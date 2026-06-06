import type { SimulationStep } from '../types/simulation'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:18083'

export interface KnowledgePointDto {
  id: string
  layer: '应用层' | '传输层' | '网络层' | '数据链路层' | '物理层'
  title: string
  category: string
  summary: string
  detail: string
}

export interface DnsCacheDto {
  domain: string
  ip: string
  ttl: string
  source: string
}

export interface DnsResolveResponse {
  domain: string
  ip: string
  cacheHit: boolean
  cacheLayer: 'host' | 'resolver' | 'miss'
  steps: SimulationStep[]
}

export async function fetchKnowledgePoints() {
  const data = await request<{ content: KnowledgePointDto[] }>('/api/knowledge/points?page=0&size=100')
  return data.content
}

export async function saveKnowledgePoint(point: KnowledgePointDto, exists: boolean) {
  return request<KnowledgePointDto>(exists ? `/api/knowledge/points/${point.id}` : '/api/knowledge/points', {
    method: exists ? 'PUT' : 'POST',
    body: JSON.stringify(point),
  })
}

export async function deleteKnowledgePoint(id: string) {
  await request<void>(`/api/knowledge/points/${id}`, { method: 'DELETE' })
}

export async function fetchDnsCache() {
  return request<DnsCacheDto[]>('/api/dns/cache')
}

export async function fetchHostDnsCache() {
  return request<DnsCacheDto[]>('/api/dns/host-cache')
}

export async function resolveDns(domain: string) {
  return request<DnsResolveResponse>('/api/dns/resolve', {
    method: 'POST',
    body: JSON.stringify({ domain }),
  })
}

export async function commitDnsResolution(domain: string) {
  await request<void>('/api/dns/commit', {
    method: 'POST',
    body: JSON.stringify({ domain }),
  })
}

export async function clearResolverDnsCacheApi() {
  await request<void>('/api/dns/cache', { method: 'DELETE' })
}

export async function clearHostDnsCacheApi() {
  await request<void>('/api/dns/host-cache', { method: 'DELETE' })
}

export async function fetchTcpSteps(mode: 'handshake' | 'release', clientSeq: number, serverSeq: number) {
  return request<SimulationStep[]>(`/api/tcp/${mode}`, {
    method: 'POST',
    body: JSON.stringify({ clientSeq, serverSeq }),
  })
}

export async function fetchScenarioSteps(domain = 'www.abc.com') {
  return request<SimulationStep[]>('/api/scenarios/web-visit', {
    method: 'POST',
    body: JSON.stringify({ domain }),
  })
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`NetVerse API ${response.status}: ${path}`)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
