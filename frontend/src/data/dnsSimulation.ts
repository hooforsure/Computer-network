import type { SimulationStep, TopologyNode } from '../types/simulation'

export interface DnsCacheRecord {
  domain: string
  ip: string
  ttl: string
  source: string
}

export function createDnsTopology(domain: string): TopologyNode[] {
  const normalizedDomain = normalizeDomain(domain)
  const domainParts = parseDomain(normalizedDomain)
  return [
  { id: 'client', label: 'Browser Client', role: 'Browser + OS + Hosts', kind: 'client', position: [-5.2, -0.5, 0], color: '#22d3ee' },
  { id: 'cache', label: 'Local Cache', role: 'Browser/OS/Hosts', kind: 'cache', position: [-3.25, 0.65, -0.6], color: '#34d399' },
  { id: 'localDns', label: 'Local DNS', role: 'Recursive resolver', kind: 'resolver', position: [-1.35, -0.4, 0.25], color: '#38bdf8' },
  { id: 'rootDns', label: 'Root DNS', role: `Delegates ${domainParts.tld}`, kind: 'dns-root', position: [1.2, 1.25, -0.25], color: '#f59e0b' },
  { id: 'tldDns', label: `${domainParts.tld} TLD DNS`, role: `Delegates ${domainParts.registeredDomain}`, kind: 'dns-tld', position: [3.05, -0.3, 0.1], color: '#a78bfa' },
  { id: 'authDns', label: `${domainParts.registeredDomain} DNS`, role: 'Authoritative answer', kind: 'dns-authority', position: [4.72, 1.08, -0.35], color: '#f472b6' },
  { id: 'webServer', label: `${normalizedDomain} Server`, role: 'Final target IP', kind: 'web-server', position: [5.8, -0.55, 0.25], color: '#f59e0b' },
  { id: 'publicNet', label: 'Public Internet', role: 'Router hops / ISP path', kind: 'network', position: [0.2, -0.78, 3.15], color: '#34d399' },
  ]
}

export function createDnsIdleStep(domain: string, cacheRows: DnsCacheRecord[] = []): SimulationStep {
  const normalizedDomain = normalizeDomain(domain)
  return {
    id: 'dns-idle',
    title: 'Ready to resolve',
    protocol: 'DNS',
    packetType: 'IDLE',
    direction: 'local',
    fromNode: 'client',
    toNode: 'client',
    path: [],
    cameraFocus: 'localDns',
    highlightNodes: [],
    highlightLinks: [],
    packetFields: {
      'Query Name': normalizedDomain,
      Status: 'waiting for Play or Resolve',
      'Cache Rows': cacheRows.length,
    },
    tables: [
      {
        label: 'DNS Cache',
        columns: ['Domain', 'IP', 'TTL', 'Source'],
        rows: toCacheTableRows(cacheRows, 'compact'),
      },
    ],
    result: { label: 'Run status', value: 'No DNS packet has been sent yet', tone: 'cyan' },
    teachingPoints: [
      'Press Play or Resolve domain to start a DNS lookup transaction.',
      'No query link is drawn before the run starts.',
    ],
    explanation: 'The protocol lab is idle. The client has not checked cache or sent any DNS packet yet.',
    log: `Idle: waiting to resolve ${normalizedDomain}`,
  }
}

interface CreateDnsStepsOptions {
  cachedRecord?: DnsCacheRecord
  cacheRows?: DnsCacheRecord[]
}

export function createDnsSteps(domain: string, options: CreateDnsStepsOptions = {}): SimulationStep[] {
  const normalizedDomain = normalizeDomain(domain)
  const domainParts = parseDomain(normalizedDomain)
  const ip = resolveDnsIp(normalizedDomain)
  const tldNsIp = '127.23.45.78'
  const authNsIp = normalizedDomain.includes('baidu') ? '155.123.34.56' : '155.123.34.57'
  const cacheRows = options.cacheRows ?? []
  const cachedRecord = options.cachedRecord
  const finalCacheRows = upsertCacheRow(cacheRows, {
    domain: normalizedDomain,
    ip,
    ttl: '300s',
    source: 'resolver',
  })

  if (cachedRecord) {
    return [
      {
        id: 'dns-cache-hit',
        title: 'DNS cache hit',
        protocol: 'DNS',
        packetType: 'CACHE_HIT',
        direction: 'local',
        visualMode: 'local-scan',
        fromNode: 'client',
        toNode: 'cache',
        path: ['client', 'cache'],
        cameraFocus: 'localDns',
        highlightNodes: ['client', 'cache'],
        highlightLinks: [['client', 'cache']],
        packetFields: {
          'Query Name': normalizedDomain,
          'Query Type': 'A',
          Lookup: 'browser cache -> OS cache -> Hosts',
          'Cache Status': 'HIT',
          'Answer IP': cachedRecord.ip,
          TTL: cachedRecord.ttl,
        },
        result: { label: 'Resolved IP', value: `${normalizedDomain} -> ${cachedRecord.ip}`, tone: 'emerald' },
        tables: [
          {
            label: 'DNS Cache',
            columns: ['Domain', 'IP', 'TTL', 'Source'],
            rows: toCacheTableRows(cacheRows, 'compact'),
          },
        ],
        teachingPoints: [
          'A cache hit skips the recursive query path.',
          'The TTL decides how long this mapping can remain valid.',
        ],
        explanation: 'The browser finds the domain in the local DNS cache, so it does not need recursive resolution.',
        log: `Cache hit: ${normalizedDomain} -> ${cachedRecord.ip}`,
      },
    ]
  }

  return [
    {
      id: 'dns-01',
      title: 'Check local DNS cache',
      protocol: 'DNS',
      packetType: 'CACHE_LOOKUP',
      direction: 'local',
      visualMode: 'local-scan',
      fromNode: 'client',
      toNode: 'cache',
      path: ['client', 'cache'],
      cameraFocus: 'localDns',
      highlightNodes: ['client', 'cache'],
      highlightLinks: [['client', 'cache']],
      packetFields: {
        'Query Name': normalizedDomain,
        'Query Type': 'A',
        Lookup: 'browser cache -> OS cache -> Hosts',
        'Cache Status': 'MISS',
        'Next Action': 'ask local DNS resolver',
      },
      result: { label: 'Cache state', value: 'Cache miss, recursive resolution required', tone: 'amber' },
      tables: [
        {
          label: 'DNS Cache',
          columns: ['Domain', 'IP', 'TTL', 'Source'],
          rows: toCacheTableRows(cacheRows, 'compact'),
        },
      ],
      teachingPoints: [
        'Clients check cache first to avoid repeated network queries.',
        'A cache miss means the resolver must find the authoritative answer.',
      ],
      explanation: 'The browser first checks the local cache. No matching record is available, so resolution continues.',
      log: `Cache miss for ${normalizedDomain}`,
    },
    {
      id: 'dns-02',
      title: 'Request local DNS resolver',
      protocol: 'DNS',
      packetType: 'DNS_QUERY',
      direction: 'request',
      fromNode: 'client',
      toNode: 'localDns',
      path: ['client', 'localDns'],
      cameraFocus: 'localDns',
      highlightNodes: ['client', 'localDns'],
      highlightLinks: [['client', 'localDns']],
      packetFields: {
        'Query Name': normalizedDomain,
        'Query Type': 'A',
        Transport: 'UDP/53',
        'Recursive Desired': true,
        'Expected Answer': 'IPv4 address',
      },
      result: { label: 'Resolver role', value: 'Local DNS starts recursive lookup', tone: 'cyan' },
      teachingPoints: [
        'The client usually asks the local DNS resolver instead of querying every DNS level itself.',
        'UDP port 53 is the common transport for standard DNS queries.',
      ],
      explanation: 'The client sends a recursive DNS query to the configured local DNS resolver such as an ISP DNS or 8.8.8.8.',
      log: `Client asks Local DNS for ${normalizedDomain}`,
    },
    {
      id: 'dns-03',
      title: 'Local DNS asks root server',
      protocol: 'DNS',
      packetType: 'DNS_QUERY',
      direction: 'request',
      fromNode: 'localDns',
      toNode: 'rootDns',
      path: ['localDns', 'rootDns'],
      cameraFocus: 'rootDns',
      highlightNodes: ['localDns', 'rootDns'],
      highlightLinks: [['localDns', 'rootDns']],
      packetFields: {
        'Query Name': normalizedDomain,
        'Query Type': 'A',
        Transport: 'UDP/53',
        Question: `Who delegates ${domainParts.tld}?`,
        'Original QNAME': normalizedDomain,
        'Resolver Goal': `find ${domainParts.tld} delegation`,
      },
      result: { label: 'Request', value: `Ask root for ${domainParts.tld} delegation`, tone: 'cyan' },
      teachingPoints: [
        'The query name can still be the full domain.',
        'The root server only knows where top-level domains such as .com are delegated.',
      ],
      explanation: `The local DNS resolver asks the root server. In an actual DNS packet the QNAME can still be ${normalizedDomain}, but the useful answer here is the DNS server responsible for ${domainParts.tld}, not the final web IP.`,
      log: `Local DNS -> Root DNS: A ${normalizedDomain}?`,
    },
    {
      id: 'dns-04',
      title: 'Root returns .com TLD referral',
      protocol: 'DNS',
      packetType: 'DNS_REFERRAL',
      direction: 'response',
      fromNode: 'rootDns',
      toNode: 'localDns',
      path: ['rootDns', 'localDns'],
      cameraFocus: 'localDns',
      highlightNodes: ['rootDns', 'localDns', 'tldDns'],
      highlightLinks: [['rootDns', 'localDns']],
      packetFields: {
        'Original Query': normalizedDomain,
        'Referral Type': 'NS + Glue',
        Transport: 'UDP/53',
        'Response Code': 'NOERROR',
        'Next DNS': `${domainParts.tld} TLD DNS`,
        'Next DNS IP': tldNsIp,
      },
      result: { label: 'Referral', value: `${domainParts.tld} TLD DNS -> ${tldNsIp}`, tone: 'amber' },
      teachingPoints: [
        'Root DNS does not return the final website IP.',
        'It returns NS records and glue addresses for the next DNS level.',
      ],
      explanation: `The root server replies with the ${domainParts.tld} TLD DNS server and its address, so the resolver knows where to ask next.`,
      log: `Root DNS -> Local DNS: ask ${domainParts.tld} TLD DNS at ${tldNsIp}`,
    },
    {
      id: 'dns-05',
      title: 'Local DNS asks .com TLD server',
      protocol: 'DNS',
      packetType: 'DNS_QUERY',
      direction: 'request',
      fromNode: 'localDns',
      toNode: 'tldDns',
      path: ['localDns', 'tldDns'],
      cameraFocus: 'tldDns',
      highlightNodes: ['localDns', 'tldDns'],
      highlightLinks: [['localDns', 'tldDns']],
      packetFields: {
        'Query Name': normalizedDomain,
        'Query Type': 'A',
        Transport: 'UDP/53',
        Question: `Who is authoritative for ${domainParts.registeredDomain}?`,
        'Original QNAME': normalizedDomain,
        'Known TLD IP': tldNsIp,
      },
      result: { label: 'Request', value: `Ask ${domainParts.tld} TLD for ${domainParts.registeredDomain}`, tone: 'violet' },
      teachingPoints: [
        'The TLD server manages the domain suffix namespace.',
        'It can identify which authoritative DNS servers manage the registered domain.',
      ],
      explanation: `The local DNS resolver now asks the ${domainParts.tld} TLD server where the authoritative DNS server for ${domainParts.registeredDomain} is.`,
      log: `Local DNS -> TLD DNS: A ${normalizedDomain}?`,
    },
    {
      id: 'dns-06',
      title: 'TLD returns authoritative DNS referral',
      protocol: 'DNS',
      packetType: 'DNS_REFERRAL',
      direction: 'response',
      fromNode: 'tldDns',
      toNode: 'localDns',
      path: ['tldDns', 'localDns'],
      cameraFocus: 'localDns',
      highlightNodes: ['tldDns', 'localDns', 'authDns'],
      highlightLinks: [['tldDns', 'localDns']],
      packetFields: {
        'Original Query': normalizedDomain,
        'Referral Type': 'NS + Glue',
        Transport: 'UDP/53',
        'Response Code': 'NOERROR',
        'Authoritative DNS': `${domainParts.registeredDomain} authoritative DNS`,
        'Authoritative DNS IP': authNsIp,
      },
      result: { label: 'Referral', value: `${domainParts.registeredDomain} DNS -> ${authNsIp}`, tone: 'violet' },
      teachingPoints: [
        'The TLD still does not return the final web server IP.',
        'It returns the authoritative DNS server for the registered domain.',
      ],
      explanation: `The TLD server points the resolver to the authoritative DNS server that maintains records for ${domainParts.registeredDomain}.`,
      log: `TLD DNS -> Local DNS: ask authority at ${authNsIp}`,
    },
    {
      id: 'dns-07',
      title: 'Local DNS asks authoritative server',
      protocol: 'DNS',
      packetType: 'DNS_QUERY',
      direction: 'request',
      fromNode: 'localDns',
      toNode: 'authDns',
      path: ['localDns', 'authDns'],
      cameraFocus: 'authDns',
      highlightNodes: ['localDns', 'authDns'],
      highlightLinks: [['localDns', 'authDns']],
      packetFields: {
        'Query Name': normalizedDomain,
        'Query Type': 'A',
        Transport: 'UDP/53',
        'Known Authority IP': authNsIp,
        Question: `What is the final A record for ${normalizedDomain}?`,
      },
      result: { label: 'Request', value: `Ask authority for final A record`, tone: 'cyan' },
      teachingPoints: [
        'The authoritative server directly maintains the zone record.',
        'This is the first DNS level that can return the final A record for this name.',
      ],
      explanation: `The resolver asks the authoritative DNS server for the exact A record of ${normalizedDomain}.`,
      log: `Local DNS -> Authoritative DNS: A ${normalizedDomain}?`,
    },
    {
      id: 'dns-08',
      title: 'Authoritative server returns final IP',
      protocol: 'DNS',
      packetType: 'DNS_RESPONSE',
      direction: 'response',
      fromNode: 'authDns',
      toNode: 'localDns',
      path: ['authDns', 'localDns'],
      cameraFocus: 'localDns',
      highlightNodes: ['authDns', 'localDns'],
      highlightLinks: [['authDns', 'localDns']],
      packetFields: {
        'Query Name': normalizedDomain,
        'Response Type': 'A',
        Transport: 'UDP/53',
        'Response Code': 'NOERROR',
        'Answer IP': ip,
        TTL: '300s',
      },
      result: { label: 'Authoritative answer', value: `${normalizedDomain} -> ${ip}`, tone: 'emerald' },
      teachingPoints: [
        'The A record maps the host name to an IPv4 address.',
        'The TTL tells caches how long this answer may be reused.',
      ],
      explanation: `The authoritative DNS server returns the final IP address for ${normalizedDomain}.`,
      log: `Authoritative DNS -> Local DNS: ${normalizedDomain} = ${ip}`,
    },
    {
      id: 'dns-09',
      title: 'Return result and update caches',
      protocol: 'DNS',
      packetType: 'DNS_RESPONSE',
      direction: 'response',
      fromNode: 'localDns',
      toNode: 'client',
      path: ['localDns', 'cache', 'client'],
      cameraFocus: 'client',
      highlightNodes: ['client', 'cache', 'localDns'],
      highlightLinks: [['localDns', 'cache'], ['localDns', 'client']],
      packetFields: {
        'Query Name': normalizedDomain,
        'Response Type': 'A',
        'Answer IP': ip,
        TTL: '300s',
        'Cache Update': 'local DNS + browser/OS cache',
      },
      result: { label: 'Final resolved address', value: `${normalizedDomain} -> ${ip}`, tone: 'emerald' },
      tables: [
        {
          label: 'DNS Cache',
          columns: ['Domain', 'IP', 'TTL', 'Source'],
          rows: toCacheTableRows(finalCacheRows, 'compact'),
        },
      ],
      teachingPoints: [
        'Both the local DNS resolver and the client can cache the answer.',
        'A later visit can skip most of the recursive process until the TTL expires.',
      ],
      explanation: 'The resolver returns the IP to the client and stores the answer in cache for later requests.',
      log: `Local DNS -> Client: ${normalizedDomain} = ${ip}; cache updated`,
    },
    {
      id: 'dns-10',
      title: 'Browser connects to web server',
      protocol: 'DNS',
      packetType: 'CONNECT',
      direction: 'connect',
      fromNode: 'client',
      toNode: 'webServer',
      path: ['client', 'publicNet', 'webServer'],
      cameraFocus: 'publicNet',
      highlightNodes: ['client', 'publicNet', 'webServer'],
      highlightLinks: [['client', 'publicNet'], ['publicNet', 'webServer']],
      packetFields: {
        'Resolved Domain': normalizedDomain,
        'Destination IP': ip,
        'Next Protocol': 'TCP + HTTP/HTTPS',
        'Data Path': 'client -> routers/ISP -> web server',
        'DNS Resolver': 'not in this connection path',
        Result: 'browser can open the website',
      },
      result: { label: 'Website access target', value: `${ip}`, tone: 'emerald' },
      teachingPoints: [
        'DNS only resolves the address; it is not a transit node for later web traffic.',
        'The browser now starts a TCP/HTTP or HTTPS connection to the resolved IP.',
        'Packets may pass through routers, NAT, ISP networks, CDN or load balancers, but not through the DNS resolver.',
      ],
      explanation: 'After DNS resolution completes, the resolver leaves the data path. The browser uses the resolved IP as the destination and sends packets through normal routing hops toward the web server.',
      log: `Browser -> router hops -> Web Server ${ip}; DNS resolver is no longer in the path`,
    },
  ]
}

function parseDomain(domain: string) {
  const parts = domain.split('.').filter(Boolean)
  const tld = parts.length > 0 ? `.${parts[parts.length - 1]}` : '.com'
  const registeredDomain = parts.length >= 2 ? `${parts[parts.length - 2]}.${parts[parts.length - 1]}` : domain
  return { tld, registeredDomain }
}

export function normalizeDomain(domain: string) {
  return domain.trim().toLowerCase() || 'www.baidu.com'
}

export function resolveDnsIp(domain: string) {
  const normalizedDomain = normalizeDomain(domain)
  if (normalizedDomain.includes('baidu')) return '128.23.14.16'
  if (normalizedDomain.includes('qq')) return '183.3.226.35'
  if (normalizedDomain.includes('taobao')) return '140.205.94.189'
  return '93.184.216.34'
}

export function upsertCacheRow(rows: DnsCacheRecord[], record: DnsCacheRecord) {
  const next = rows.filter((row) => row.domain !== record.domain)
  return [record, ...next].slice(0, 6)
}

function toCacheTableRows(rows: DnsCacheRecord[], mode: 'compact' | 'full' = 'full') {
  return rows.map((row) => ({
    Domain: row.domain,
    IP: row.ip,
    TTL: row.ttl,
    Source: mode === 'compact' && row.source === 'resolver' ? 'resolv' : row.source,
  }))
}
