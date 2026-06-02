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
  fromNode: string
  toNode: string
  path: string[]
  broadcast?: boolean
  cameraFocus?: string
  highlightNodes?: string[]
  highlightLinks?: Array<[string, string]>
  packetFields: PacketFields
  tables?: TableSnapshot[]
  clientState?: string
  serverState?: string
  explanation: string
  log: string
}

export interface TopologyNode {
  id: string
  label: string
  role: string
  position: [number, number, number]
  color: string
}
