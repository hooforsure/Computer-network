import type { SimulationStep, TopologyNode } from '../types/simulation'

export const dnsTopology: TopologyNode[] = [
  { id: 'client', label: 'Client', role: 'Browser', position: [-5.2, -0.5, 0], color: '#22d3ee' },
  { id: 'cache', label: 'Local Cache', role: 'DNS cache', position: [-3.1, 1.4, -0.6], color: '#34d399' },
  { id: 'localDns', label: 'Local DNS', role: 'Resolver', position: [-1.2, -0.4, 0.25], color: '#38bdf8' },
  { id: 'rootDns', label: 'Root DNS', role: 'Root', position: [1.4, 1.2, -0.25], color: '#f59e0b' },
  { id: 'tldDns', label: '.com DNS', role: 'TLD', position: [3.2, -0.3, 0.1], color: '#a78bfa' },
  { id: 'authDns', label: 'abc.com DNS', role: 'Authoritative', position: [5.1, 1.1, -0.35], color: '#f472b6' },
]

export function createDnsSteps(domain: string, cacheHit = false): SimulationStep[] {
  const ip = domain.includes('baidu') ? '110.242.68.66' : '93.184.216.34'

  if (cacheHit) {
    return [
      {
        id: 'dns-cache-hit',
        title: 'DNS cache hit',
        protocol: 'DNS',
        packetType: 'CACHE_HIT',
        fromNode: 'client',
        toNode: 'cache',
        path: ['client', 'cache'],
        cameraFocus: 'cache',
        highlightNodes: ['client', 'cache'],
        highlightLinks: [['client', 'cache']],
        packetFields: {
          domain,
          type: 'A',
          result: ip,
          ttl: 300,
        },
        tables: [
          {
            label: 'DNS Cache',
            columns: ['Domain', 'IP', 'TTL'],
            rows: [{ Domain: domain, IP: ip, TTL: '300s' }],
          },
        ],
        explanation: 'The browser finds the domain in the local DNS cache, so it does not need recursive resolution.',
        log: `Cache hit: ${domain} -> ${ip}`,
      },
    ]
  }

  return [
    {
      id: 'dns-01',
      title: 'Check local DNS cache',
      protocol: 'DNS',
      packetType: 'CACHE_LOOKUP',
      fromNode: 'client',
      toNode: 'cache',
      path: ['client', 'cache'],
      cameraFocus: 'cache',
      highlightNodes: ['client', 'cache'],
      highlightLinks: [['client', 'cache']],
      packetFields: {
        domain,
        type: 'A',
        result: 'miss',
      },
      tables: [
        {
          label: 'DNS Cache',
          columns: ['Domain', 'IP', 'TTL'],
          rows: [],
        },
      ],
      explanation: 'The browser first checks the local cache. No matching record is available, so resolution continues.',
      log: `Cache miss for ${domain}`,
    },
    {
      id: 'dns-02',
      title: 'Ask local DNS resolver',
      protocol: 'DNS',
      packetType: 'DNS_QUERY',
      fromNode: 'client',
      toNode: 'localDns',
      path: ['client', 'localDns'],
      cameraFocus: 'localDns',
      highlightNodes: ['client', 'localDns'],
      highlightLinks: [['client', 'localDns']],
      packetFields: {
        query: domain,
        type: 'A',
        recursiveDesired: true,
      },
      explanation: 'The client sends a recursive DNS query to the configured local DNS resolver.',
      log: `Client asks Local DNS for ${domain}`,
    },
    {
      id: 'dns-03',
      title: 'Query root DNS server',
      protocol: 'DNS',
      packetType: 'DNS_QUERY',
      fromNode: 'localDns',
      toNode: 'rootDns',
      path: ['localDns', 'rootDns'],
      cameraFocus: 'rootDns',
      highlightNodes: ['localDns', 'rootDns'],
      highlightLinks: [['localDns', 'rootDns']],
      packetFields: {
        query: domain,
        referral: '.com name servers',
      },
      explanation: 'The local resolver asks a root DNS server and receives a referral to the .com top-level domain.',
      log: 'Root DNS returns .com TLD referral',
    },
    {
      id: 'dns-04',
      title: 'Query .com TLD server',
      protocol: 'DNS',
      packetType: 'DNS_QUERY',
      fromNode: 'rootDns',
      toNode: 'tldDns',
      path: ['rootDns', 'tldDns'],
      cameraFocus: 'tldDns',
      highlightNodes: ['rootDns', 'tldDns'],
      highlightLinks: [['rootDns', 'tldDns']],
      packetFields: {
        query: domain,
        referral: 'abc.com authoritative DNS',
      },
      explanation: 'The .com server does not know the final IP, but it points the resolver to the authoritative DNS server.',
      log: 'TLD DNS returns authoritative server address',
    },
    {
      id: 'dns-05',
      title: 'Query authoritative DNS',
      protocol: 'DNS',
      packetType: 'DNS_QUERY',
      fromNode: 'tldDns',
      toNode: 'authDns',
      path: ['tldDns', 'authDns'],
      cameraFocus: 'authDns',
      highlightNodes: ['tldDns', 'authDns'],
      highlightLinks: [['tldDns', 'authDns']],
      packetFields: {
        query: domain,
        answer: ip,
        ttl: 300,
      },
      explanation: 'The authoritative DNS server owns the zone data and returns the final A record.',
      log: `Authoritative DNS answers ${domain} -> ${ip}`,
    },
    {
      id: 'dns-06',
      title: 'Return IP and update cache',
      protocol: 'DNS',
      packetType: 'DNS_RESPONSE',
      fromNode: 'localDns',
      toNode: 'client',
      path: ['authDns', 'localDns', 'cache', 'client'],
      cameraFocus: 'client',
      highlightNodes: ['client', 'cache', 'localDns'],
      highlightLinks: [['localDns', 'cache'], ['localDns', 'client']],
      packetFields: {
        domain,
        answer: ip,
        ttl: 300,
      },
      tables: [
        {
          label: 'DNS Cache',
          columns: ['Domain', 'IP', 'TTL'],
          rows: [{ Domain: domain, IP: ip, TTL: '300s' }],
        },
      ],
      explanation: 'The resolver returns the IP to the client and stores the answer in cache for later requests.',
      log: `Resolution complete: ${domain} -> ${ip}`,
    },
  ]
}
