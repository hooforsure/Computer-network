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
    { id: 'client', label: '主机 / 浏览器', role: '访问发起者', kind: 'client', position: [-5.2, -0.5, 0], color: '#22d3ee' },
    { id: 'cache', label: '主机缓存', role: 'Browser / OS / Hosts', kind: 'cache', position: [-5.2, 1.05, -0.18], color: '#34d399' },
    { id: 'localDns', label: '本地 DNS', role: '递归解析器', kind: 'resolver', position: [-1.35, -0.4, 0.25], color: '#38bdf8' },
    { id: 'rootDns', label: '根 DNS', role: `返回 ${domainParts.tld} 去向`, kind: 'dns-root', position: [1.2, 1.25, -0.25], color: '#f59e0b' },
    { id: 'tldDns', label: `${domainParts.tld} 顶级域 DNS`, role: `返回 ${domainParts.registeredDomain} 权威 DNS`, kind: 'dns-tld', position: [3.05, -0.3, 0.1], color: '#a78bfa' },
    { id: 'authDns', label: `${domainParts.registeredDomain} 权威 DNS`, role: '维护最终 A 记录', kind: 'dns-authority', position: [4.72, 1.08, -0.35], color: '#f472b6' },
    { id: 'webServer', label: `${normalizedDomain} Web`, role: '最终访问目标', kind: 'web-server', position: [5.8, -0.55, 0.25], color: '#f59e0b' },
    { id: 'publicNet', label: '公网链路', role: 'Router / ISP 跳转路径', kind: 'network', position: [0.2, -0.78, 3.15], color: '#34d399' },
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
      Status: '待解析',
      'Resolver Cache Rows': cacheRows.length,
    },
    tables: [
      {
        label: 'Local DNS Resolver Cache',
        columns: ['Domain', 'IP', 'TTL', 'Source'],
        rows: toCacheTableRows(cacheRows, 'compact'),
      },
    ],
    result: { label: '运行状态', value: '尚未发送 DNS 报文', tone: 'cyan' },
    teachingPoints: ['开始解析后会先检查主机侧缓存。'],
    explanation: '当前还没有开始查询；主机缓存和本地 DNS 都未参与通信。',
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
      hostCacheLookupStep(normalizedDomain, cacheRows, false),
      {
        id: 'dns-resolver-cache-hit-02',
        title: '请求本地 DNS 并命中缓存',
        protocol: 'DNS',
        packetType: 'RESOLVER_CACHE_HIT',
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
          'Cache Status': 'HIT',
          'Answer IP': cachedRecord.ip,
          TTL: cachedRecord.ttl,
        },
        result: { label: '本地 DNS 缓存命中', value: `${normalizedDomain} -> ${cachedRecord.ip}`, tone: 'emerald' },
        tables: [
          {
            label: 'Local DNS Resolver Cache',
            columns: ['Domain', 'IP', 'TTL', 'Source'],
            rows: toCacheTableRows(cacheRows, 'compact'),
          },
        ],
        teachingPoints: ['本地 DNS 命中后会跳过根 DNS、顶级域 DNS 和权威 DNS 查询。'],
        explanation: '主机缓存未命中后，请求到达本地 DNS；本地 DNS 缓存已有该域名记录。',
        log: `Local DNS resolver cache hit: ${normalizedDomain} -> ${cachedRecord.ip}`,
      },
      {
        id: 'dns-resolver-cache-hit-03',
        title: '本地 DNS 返回 IP 给主机',
        protocol: 'DNS',
        packetType: 'DNS_RESPONSE',
        direction: 'response',
        fromNode: 'localDns',
        toNode: 'client',
        path: ['localDns', 'client'],
        cameraFocus: 'client',
        highlightNodes: ['client', 'cache', 'localDns'],
        highlightLinks: [['localDns', 'client']],
        packetFields: {
          'Query Name': normalizedDomain,
          'Response Type': 'A',
          'Answer IP': cachedRecord.ip,
          TTL: cachedRecord.ttl,
          'Cache Update': 'Host-side cache may store the returned answer',
        },
        result: { label: '解析结果返回主机', value: `${normalizedDomain} -> ${cachedRecord.ip}`, tone: 'emerald' },
        teachingPoints: ['主机收到响应后，可以在浏览器或 OS DNS 缓存中保存结果。'],
        explanation: '返回路径是本地 DNS 到主机；主机侧缓存更新是本机内部动作，不画成本地 DNS 直连主机缓存。',
        log: `Local DNS -> Client: ${normalizedDomain} = ${cachedRecord.ip}`,
      },
    ]
  }

  return [
    hostCacheLookupStep(normalizedDomain, cacheRows, false),
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
      result: { label: '解析器开始工作', value: '本地 DNS 开始递归查询', tone: 'cyan' },
      teachingPoints: ['客户端通常只请求本地 DNS 递归解析器。', 'DNS 标准查询常使用 UDP/53。'],
      explanation: '主机把递归查询交给配置好的本地 DNS，例如运营商 DNS 或公共 DNS。',
      log: `Client asks Local DNS for ${normalizedDomain}`,
    },
    dnsStep('dns-03', '本地 DNS 询问根 DNS', 'DNS_QUERY', 'request', 'localDns', 'rootDns', 'rootDns', ['localDns', 'rootDns'], {
      'Query Name': normalizedDomain,
      'Query Type': 'A',
      Transport: 'UDP/53',
      Question: `${domainParts.tld} TLD DNS location`,
    }, '请求', '本地 DNS -> 根 DNS', '根 DNS 返回下一层顶级域 DNS 的位置。'),
    dnsStep('dns-04', '根 DNS 返回顶级域 DNS', 'DNS_REFERRAL', 'response', 'rootDns', 'localDns', 'localDns', ['rootDns', 'localDns', 'tldDns'], {
      'Original Query': normalizedDomain,
      'Referral Type': 'NS + Glue',
      'Next DNS': `${domainParts.tld} TLD DNS`,
      'Next DNS IP': tldNsIp,
    }, '返回', `${domainParts.tld} TLD DNS -> ${tldNsIp}`, '根 DNS 告诉本地 DNS 下一步询问哪个顶级域 DNS。'),
    dnsStep('dns-05', '本地 DNS 询问顶级域 DNS', 'DNS_QUERY', 'request', 'localDns', 'tldDns', 'tldDns', ['localDns', 'tldDns'], {
      'Query Name': normalizedDomain,
      'Query Type': 'A',
      Transport: 'UDP/53',
      Question: `${domainParts.registeredDomain} authoritative DNS location`,
    }, '请求', `本地 DNS -> ${domainParts.tld} 顶级域 DNS`, '顶级域 DNS 返回负责注册域名的权威 DNS。'),
    dnsStep('dns-06', '顶级域 DNS 返回权威 DNS', 'DNS_REFERRAL', 'response', 'tldDns', 'localDns', 'localDns', ['tldDns', 'localDns', 'authDns'], {
      'Original Query': normalizedDomain,
      'Referral Type': 'NS + Glue',
      'Authoritative DNS': `${domainParts.registeredDomain} authoritative DNS`,
      'Authoritative DNS IP': authNsIp,
    }, '返回', `${domainParts.registeredDomain} 权威 DNS -> ${authNsIp}`, '本地 DNS 继续向权威 DNS 查询最终 A 记录。'),
    dnsStep('dns-07', '本地 DNS 询问权威 DNS', 'DNS_QUERY', 'request', 'localDns', 'authDns', 'authDns', ['localDns', 'authDns'], {
      'Query Name': normalizedDomain,
      'Query Type': 'A',
      Transport: 'UDP/53',
      'Known Authority IP': authNsIp,
    }, '请求', '本地 DNS -> 权威 DNS', '权威 DNS 直接维护该区域的记录。'),
    dnsStep('dns-08', '权威 DNS 返回最终 IP', 'DNS_RESPONSE', 'response', 'authDns', 'localDns', 'localDns', ['authDns', 'localDns'], {
      'Query Name': normalizedDomain,
      'Response Type': 'A',
      'Answer IP': ip,
      TTL: '300s',
    }, '权威应答', `${normalizedDomain} -> ${ip}`, '权威 DNS 返回最终 IP，本地 DNS 获得可返回给主机的答案。'),
    {
      id: 'dns-09',
      title: '返回结果并写入缓存',
      protocol: 'DNS',
      packetType: 'DNS_RESPONSE',
      direction: 'response',
      fromNode: 'localDns',
      toNode: 'client',
      path: ['localDns', 'client'],
      cameraFocus: 'client',
      highlightNodes: ['client', 'cache', 'localDns'],
      highlightLinks: [['localDns', 'client']],
      packetFields: {
        'Query Name': normalizedDomain,
        'Response Type': 'A',
        'Answer IP': ip,
        TTL: '300s',
        'Cache Update': 'Local DNS cache + host-side cache',
      },
      result: { label: '最终解析结果', value: `${normalizedDomain} -> ${ip}`, tone: 'emerald' },
      tables: [
        {
          label: 'Local DNS Resolver Cache',
          columns: ['Domain', 'IP', 'TTL', 'Source'],
          rows: toCacheTableRows(finalCacheRows, 'compact'),
        },
      ],
      teachingPoints: ['本地 DNS 持久化缓存；主机侧也可缓存返回结果。'],
      explanation: '本地 DNS 把最终 IP 返回给主机，同时更新自己的缓存；主机收到结果后写入浏览器或 OS DNS 缓存。',
      log: `Local DNS -> Client: ${normalizedDomain} = ${ip}; caches updated`,
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
        'Data Path': 'Host -> Router/ISP -> Web Server',
        'DNS Resolver': 'Not in later web traffic path',
      },
      result: { label: '访问目标', value: ip, tone: 'emerald' },
      teachingPoints: ['DNS 只负责解析地址，不是后续 Web 流量的中转节点。'],
      explanation: 'DNS 解析完成后，主机以解析出的 IP 为目标，通过正常路由路径访问 Web 服务器。',
      log: `Browser -> router hops -> Web Server ${ip}; DNS resolver is no longer in the path`,
    },
  ]
}

function hostCacheLookupStep(normalizedDomain: string, cacheRows: DnsCacheRecord[], hit: boolean): SimulationStep {
  const ip = resolveDnsIp(normalizedDomain)
  return {
    id: hit ? 'dns-host-cache-hit-01' : 'dns-01',
    title: hit ? '主机缓存命中' : '检查主机缓存',
    protocol: 'DNS',
    packetType: hit ? 'HOST_CACHE_HIT' : 'CACHE_LOOKUP',
    direction: 'local',
    visualMode: 'local-scan',
    fromNode: 'client',
    toNode: 'cache',
    path: ['client', 'cache'],
    cameraFocus: 'client',
    highlightNodes: ['client', 'cache'],
    highlightLinks: [['client', 'cache']],
    packetFields: {
      'Query Name': normalizedDomain,
      'Query Type': 'A',
      Lookup: 'Browser Cache -> OS DNS Cache -> Hosts',
      'Cache Status': hit ? 'HIT' : 'MISS',
      ...(hit ? { 'Answer IP': ip, TTL: '300s' } : { 'Next Action': 'Request Local DNS Resolver' }),
    },
    result: hit
      ? { label: '主机缓存命中', value: `${normalizedDomain} -> ${ip}`, tone: 'emerald' }
      : { label: '主机缓存未命中', value: '需要请求本地 DNS 递归解析', tone: 'amber' },
    tables: [
      {
        label: 'Local DNS Resolver Cache',
        columns: ['Domain', 'IP', 'TTL', 'Source'],
        rows: toCacheTableRows(cacheRows, 'compact'),
      },
    ],
    teachingPoints: hit
      ? ['主机侧缓存命中时，不会向本地 DNS 递归解析器发送 DNS 查询。']
      : ['主机侧未命中后才会请求本地 DNS。'],
    explanation: hit
      ? '浏览器或操作系统侧已经保存该域名记录，主机可直接得到 IP。'
      : '主机先检查浏览器缓存、操作系统 DNS 缓存和 Hosts；没有找到记录，所以继续请求本地 DNS。',
    log: `${hit ? 'Host cache hit' : 'Host cache miss'} for ${normalizedDomain}`,
  }
}

function dnsStep(
  id: string,
  title: string,
  packetType: string,
  direction: 'request' | 'response',
  fromNode: string,
  toNode: string,
  cameraFocus: string,
  highlightNodes: string[],
  packetFields: SimulationStep['packetFields'],
  resultLabel: string,
  resultValue: string,
  explanation: string,
): SimulationStep {
  return {
    id,
    title,
    protocol: 'DNS',
    packetType,
    direction,
    fromNode,
    toNode,
    path: [fromNode, toNode],
    cameraFocus,
    highlightNodes,
    highlightLinks: [[fromNode, toNode]],
    packetFields,
    result: { label: resultLabel, value: resultValue, tone: direction === 'response' ? 'amber' : 'cyan' },
    teachingPoints: [explanation],
    explanation,
    log: `${fromNode} -> ${toNode}: ${packetType}`,
  }
}

function parseDomain(domain: string) {
  const parts = domain.split('.').filter(Boolean)
  const tld = parts.length > 0 ? `.${parts[parts.length - 1]}` : '.com'
  const registeredDomain = parts.length >= 2 ? `${parts[parts.length - 2]}.${parts[parts.length - 1]}` : domain
  return { tld, registeredDomain }
}

export function normalizeDomain(domain: string) {
  return domain.trim().toLowerCase() || 'www.abc.com'
}

export function resolveDnsIp(domain: string) {
  const normalizedDomain = normalizeDomain(domain)
  if (normalizedDomain.includes('baidu')) return '128.23.14.16'
  if (normalizedDomain.includes('qq')) return '183.3.226.35'
  if (normalizedDomain.includes('taobao')) return '140.205.94.189'
  if (normalizedDomain.includes('abc')) return '203.0.113.10'
  return '93.184.216.34'
}

export function upsertCacheRow(rows: DnsCacheRecord[], record: DnsCacheRecord) {
  const next = rows.filter((row) => row.domain !== record.domain)
  return [record, ...next]
}

function toCacheTableRows(rows: DnsCacheRecord[], mode: 'compact' | 'full' = 'full') {
  return rows.map((row) => ({
    Domain: row.domain,
    IP: row.ip,
    TTL: row.ttl,
    Source: mode === 'compact' && row.source === 'resolver' ? 'resolv' : row.source,
  }))
}
