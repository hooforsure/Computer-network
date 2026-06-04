export type Protocol = 'DNS' | 'TCP' | 'ARP' | 'HTTP' | 'KNOWLEDGE'

export interface PacketFields {
  [key: string]: string | number | boolean | null | undefined
}

export interface TableSnapshot {
  label: string
  columns: string[]
  rows: Array<Record<string, string>>
}

export interface SimulationStep {
  id: string
  title: string
  protocol: Protocol
  packetType: string
  direction?: 'request' | 'response' | 'local' | 'connect'
  visualMode?: 'local-scan' | 'network-flight'
  fromNode: string
  toNode: string
  path: string[]
  broadcast?: boolean
  cameraFocus?: string
  highlightNodes?: string[]
  highlightLinks?: Array<[string, string]>
  packetFields: PacketFields
  requirement?: {
    purpose: string
    communicationType: '广播' | '单播' | '本地状态' | '外部递归'
    source: string
    target: string
    sourceMac: string
    destinationMac: string
    sourceIp: string
    destinationIp: string
    topologyPath: string
    switchAction: string
    macTableChange: string
    arpTableChange: string
    framePayload: string
    endState: string
  }
  tables?: TableSnapshot[]
  clientState?: string
  serverState?: string
  result?: {
    label: string
    value: string
    tone?: 'cyan' | 'emerald' | 'amber' | 'violet' | 'rose'
  }
  teachingPoints?: string[]
  explanation: string
  log: string
}

export interface TopologyNode {
  id: string
  label: string
  role: string
  kind?: 'client' | 'cache' | 'resolver' | 'dns-root' | 'dns-tld' | 'dns-authority' | 'web-server' | 'server' | 'network' | 'host' | 'switch' | 'router' | 'cloud'
  state?: Record<string, string>
  position: [number, number, number]
  color: string
}
