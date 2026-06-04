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
  { id: 'client', label: '主机 / 浏览器', role: '浏览器缓存 + OS 缓存 + Hosts', kind: 'client', position: [-5.2, -0.5, 0], color: '#22d3ee' },
  { id: 'cache', label: '本地缓存', role: '浏览器 / OS / Hosts', kind: 'cache', position: [-3.25, 0.65, -0.6], color: '#34d399' },
  { id: 'localDns', label: '本地 DNS', role: '递归解析器', kind: 'resolver', position: [-1.35, -0.4, 0.25], color: '#38bdf8' },
  { id: 'rootDns', label: '根 DNS', role: `返回 ${domainParts.tld} 的去向`, kind: 'dns-root', position: [1.2, 1.25, -0.25], color: '#f59e0b' },
  { id: 'tldDns', label: `${domainParts.tld} 顶级域 DNS`, role: `返回 ${domainParts.registeredDomain} 的权威 DNS`, kind: 'dns-tld', position: [3.05, -0.3, 0.1], color: '#a78bfa' },
  { id: 'authDns', label: `${domainParts.registeredDomain} 权威 DNS`, role: '维护最终 A 记录', kind: 'dns-authority', position: [4.72, 1.08, -0.35], color: '#f472b6' },
  { id: 'webServer', label: `${normalizedDomain} Web`, role: '最终访问目标', kind: 'web-server', position: [5.8, -0.55, 0.25], color: '#f59e0b' },
  { id: 'publicNet', label: '公网链路', role: '路由器 / ISP 跳转路径', kind: 'network', position: [0.2, -0.78, 3.15], color: '#34d399' },
  ]
}

export function createDnsIdleStep(domain: string, cacheRows: DnsCacheRecord[] = []): SimulationStep {
  const normalizedDomain = normalizeDomain(domain)
  return {
    id: 'dns-idle',
    title: '等待开始解析',
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
      Status: '等待点击播放或开始解析',
      'Cache Rows': cacheRows.length,
    },
    tables: [
      {
        label: 'DNS Cache',
        columns: ['Domain', 'IP', 'TTL', 'Source'],
        rows: toCacheTableRows(cacheRows, 'compact'),
      },
    ],
    result: { label: '运行状态', value: '尚未发送 DNS 报文', tone: 'cyan' },
    teachingPoints: [
      'Press Play or Resolve domain to start a DNS lookup transaction.',
      'No query link is drawn before the run starts.',
    ],
    explanation: '当前还没有开始查询。本地缓存未检查，也没有发送 DNS 报文。',
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
        title: '本地缓存命中',
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
          Lookup: '浏览器缓存 -> OS 缓存 -> Hosts',
          'Cache Status': 'HIT',
          'Answer IP': cachedRecord.ip,
          TTL: cachedRecord.ttl,
        },
        result: { label: '解析结果', value: `${normalizedDomain} -> ${cachedRecord.ip}`, tone: 'emerald' },
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
        explanation: '主机在本地缓存中找到域名记录，因此直接得到 IP，不再继续递归查询。',
        log: `Cache hit: ${normalizedDomain} -> ${cachedRecord.ip}`,
      },
    ]
  }

  return [
    {
      id: 'dns-01',
      title: '检查本地缓存',
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
        Lookup: '浏览器缓存 -> OS 缓存 -> Hosts',
        'Cache Status': 'MISS',
        'Next Action': '请求本地 DNS',
      },
      result: { label: '缓存状态', value: '缓存未命中，需要递归解析', tone: 'amber' },
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
      explanation: '主机先检查浏览器缓存、操作系统缓存和 Hosts。没有找到记录，所以继续请求本地 DNS。',
      log: `Cache miss for ${normalizedDomain}`,
    },
    {
      id: 'dns-02',
      title: '请求本地 DNS',
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
      result: { label: '解析器动作', value: '本地 DNS 开始递归查询', tone: 'cyan' },
      teachingPoints: [
        'The client usually asks the local DNS resolver instead of querying every DNS level itself.',
        'UDP port 53 is the common transport for standard DNS queries.',
      ],
      explanation: '主机把递归查询交给配置好的本地 DNS，例如运营商 DNS 或 8.8.8.8。',
      log: `Client asks Local DNS for ${normalizedDomain}`,
    },
    {
      id: 'dns-03',
      title: '本地 DNS 询问根 DNS',
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
        Question: `${domainParts.tld} 顶级域 DNS 在哪里？`,
        'Original QNAME': normalizedDomain,
        'Resolver Goal': `找到 ${domainParts.tld} 顶级域 DNS`,
      },
      result: { label: '请求', value: `本地 DNS -> 根 DNS：询问 ${domainParts.tld} 顶级域 DNS`, tone: 'cyan' },
      teachingPoints: [
        'The query name can still be the full domain.',
        'The root server only knows where top-level domains such as .com are delegated.',
      ],
      explanation: `本地 DNS 询问根 DNS。真实报文里的 QNAME 可以仍是 ${normalizedDomain}，但根 DNS 返回的是 ${domainParts.tld} 顶级域 DNS 的位置，而不是最终网站 IP。`,
      log: `Local DNS -> Root DNS: A ${normalizedDomain}?`,
    },
    {
      id: 'dns-04',
      title: '根 DNS 返回顶级域 DNS',
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
      result: { label: '返回', value: `${domainParts.tld} 顶级域 DNS -> ${tldNsIp}`, tone: 'amber' },
      teachingPoints: [
        'Root DNS does not return the final website IP.',
        'It returns NS records and glue addresses for the next DNS level.',
      ],
      explanation: `根 DNS 返回 ${domainParts.tld} 顶级域 DNS 及其地址，本地 DNS 因此知道下一步问谁。`,
      log: `Root DNS -> Local DNS: ask ${domainParts.tld} TLD DNS at ${tldNsIp}`,
    },
    {
      id: 'dns-05',
      title: '本地 DNS 询问顶级域 DNS',
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
        Question: `${domainParts.registeredDomain} 的权威 DNS 在哪里？`,
        'Original QNAME': normalizedDomain,
        'Known TLD IP': tldNsIp,
      },
      result: { label: '请求', value: `本地 DNS -> ${domainParts.tld} 顶级域 DNS：询问 ${domainParts.registeredDomain}`, tone: 'violet' },
      teachingPoints: [
        'The TLD server manages the domain suffix namespace.',
        'It can identify which authoritative DNS servers manage the registered domain.',
      ],
      explanation: `本地 DNS 继续询问 ${domainParts.tld} 顶级域 DNS，目标是找到 ${domainParts.registeredDomain} 的权威 DNS。`,
      log: `Local DNS -> TLD DNS: A ${normalizedDomain}?`,
    },
    {
      id: 'dns-06',
      title: '顶级域 DNS 返回权威 DNS',
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
      result: { label: '返回', value: `${domainParts.registeredDomain} 权威 DNS -> ${authNsIp}`, tone: 'violet' },
      teachingPoints: [
        'The TLD still does not return the final web server IP.',
        'It returns the authoritative DNS server for the registered domain.',
      ],
      explanation: `顶级域 DNS 返回负责 ${domainParts.registeredDomain} 的权威 DNS，本地 DNS 继续向它查询最终记录。`,
      log: `TLD DNS -> Local DNS: ask authority at ${authNsIp}`,
    },
    {
      id: 'dns-07',
      title: '本地 DNS 询问权威 DNS',
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
        Question: `${normalizedDomain} 的最终 A 记录是什么？`,
      },
      result: { label: '请求', value: `本地 DNS -> 权威 DNS：询问最终 A 记录`, tone: 'cyan' },
      teachingPoints: [
        'The authoritative server directly maintains the zone record.',
        'This is the first DNS level that can return the final A record for this name.',
      ],
      explanation: `本地 DNS 向权威 DNS 查询 ${normalizedDomain} 的精确 A 记录。`,
      log: `Local DNS -> Authoritative DNS: A ${normalizedDomain}?`,
    },
    {
      id: 'dns-08',
      title: '权威 DNS 返回最终 IP',
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
      result: { label: '权威答案', value: `${normalizedDomain} -> ${ip}`, tone: 'emerald' },
      teachingPoints: [
        'The A record maps the host name to an IPv4 address.',
        'The TTL tells caches how long this answer may be reused.',
      ],
      explanation: `权威 DNS 直接维护该域名记录，因此返回 ${normalizedDomain} 对应的最终 IP。`,
      log: `Authoritative DNS -> Local DNS: ${normalizedDomain} = ${ip}`,
    },
    {
      id: 'dns-09',
      title: '返回结果并写入缓存',
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
        'Cache Update': '本地 DNS + 浏览器/OS 缓存',
      },
      result: { label: '最终解析结果', value: `${normalizedDomain} -> ${ip}`, tone: 'emerald' },
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
      explanation: '本地 DNS 把最终 IP 返回给主机，同时把结果写入缓存，后续相同域名可直接命中。',
      log: `Local DNS -> Client: ${normalizedDomain} = ${ip}; cache updated`,
    },
    {
      id: 'dns-10',
      title: '主机连接 Web 服务器',
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
        'Data Path': '主机 -> 路由器/ISP -> Web 服务器',
        'DNS Resolver': '不在后续连接链路中',
        Result: '浏览器可以访问网站',
      },
      result: { label: '访问目标', value: `${ip}`, tone: 'emerald' },
      teachingPoints: [
        'DNS only resolves the address; it is not a transit node for later web traffic.',
        'The browser now starts a TCP/HTTP or HTTPS connection to the resolved IP.',
        'Packets may pass through routers, NAT, ISP networks, CDN or load balancers, but not through the DNS resolver.',
      ],
      explanation: 'DNS 解析完成后，DNS 解析器不再处于后续访问链路中。主机会以解析出的 IP 为目标，通过正常路由路径访问 Web 服务器。',
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
