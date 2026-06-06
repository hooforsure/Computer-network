import type { SimulationStep } from '../types/simulation'
import { cn } from '../lib/classNames'

const nodeLabels: Record<string, string> = {
  client: '主机 / 浏览器',
  cache: '主机缓存',
  localDns: '本地 DNS 服务器',
  rootDns: '根 DNS',
  tldDns: '顶级域 DNS',
  authDns: '权威 DNS',
  webServer: 'Web 服务器',
  publicNet: '公网链路',
  tcpClient: '客户端',
  tcpServer: '服务器',
  h1: 'H1',
  h2: 'H2',
  dns: '本地 DNS',
  switch: '交换机 S',
  router: '路由器 R',
  web: '外网 Web',
}

function protocolAccent(protocol: string, packetType: string) {
  const text = `${protocol} ${packetType}`.toUpperCase()
  if (text.includes('ARP')) return '#34d399'
  if (text.includes('HTTP')) return '#f59e0b'
  if (text.includes('TCP') || text.includes('SYN') || text.includes('ACK') || text.includes('FIN')) return '#8b5cf6'
  if (text.includes('DNS')) return '#22d3ee'
  return '#67e8f9'
}

const fieldLabels: Record<string, string> = {
  'Query Name': '查询域名',
  'Query Type': '记录类型',
  Lookup: '本地检查',
  'Cache Status': '缓存状态',
  'Answer IP': '返回 IP',
  TTL: 'TTL',
  'Next Action': '下一步',
  Transport: '传输方式',
  'Recursive Desired': '递归查询',
  'Expected Answer': '期望结果',
  Question: '询问内容',
  'Original QNAME': '原始域名',
  'Resolver Goal': '查询目标',
  'Original Query': '原始查询',
  'Referral Type': '返回类型',
  'Response Code': '响应状态',
  'Next DNS': '下一跳 DNS',
  'Next DNS IP': '下一跳 IP',
  'Known TLD IP': '已知 TLD IP',
  'Authoritative DNS': '权威 DNS',
  'Authoritative DNS IP': '权威 DNS IP',
  'Known Authority IP': '已知权威 IP',
  'Response Type': '响应类型',
  'Cache Update': '缓存写入',
  'Resolved Domain': '已解析域名',
  'Destination IP': '目标 IP',
  'Next Protocol': '后续协议',
  'Data Path': '后续路径',
  'DNS Resolver': 'DNS 解析器',
  Result: '结果',
  Status: '状态',
  'Cache Rows': '缓存条数',
  'Src MAC': '源 MAC',
  'Dst MAC': '目的 MAC',
  'Src IP': '源 IP',
  'Dst IP': '目的 IP',
  'Target IP': '目标 IP',
  Flags: '标志位',
  Seq: '序列号',
  Ack: '确认号',
}

const importantFields = [
  'Query Name',
  'Query Type',
  'Question',
  'Answer IP',
  'Next DNS',
  'Next DNS IP',
  'Authoritative DNS',
  'Authoritative DNS IP',
  'Cache Status',
  'Cache Update',
  'Resolved Domain',
  'Destination IP',
  'DNS Resolver',
  'Src MAC',
  'Dst MAC',
  'Src IP',
  'Dst IP',
  'Target IP',
  'Flags',
  'Seq',
  'Ack',
  'Transport',
  'TTL',
  'Status',
]

const tcpStates = [
  'CLOSED',
  'LISTEN',
  'SYN-SENT',
  'SYN-RECEIVED',
  'ESTABLISHED',
  'FIN-WAIT-1',
  'FIN-WAIT-2',
  'CLOSE-WAIT',
  'LAST-ACK',
  'TIME-WAIT',
]

export function SimulationInspector({ step }: { step: SimulationStep }) {
  const fieldRows = Object.entries(step.packetFields)
    .filter(([key, value]) => value !== undefined && value !== null && importantFields.includes(key))
    .slice(0, 8)
  const directionText = formatDirection(step)
  const packetSummary = formatPacketSummary(step)

  return (
    <aside
      key={step.id}
      className="simulation-inspector scanline h-full overflow-hidden border border-slate-800/80 bg-slate-950/78 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl"
      style={{ '--inspector-accent': protocolAccent(step.protocol, step.packetType) } as React.CSSProperties}
    >
      <header>
        <div className="mb-4 flex items-center gap-2">
          <span className="font-mono-data rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">
            {step.protocol}
          </span>
          <span className={cn(
            'font-mono-data rounded-full border px-3 py-1 text-xs',
            step.broadcast
              ? 'border-amber-300/40 bg-amber-300/10 text-amber-100'
              : 'border-emerald-300/40 bg-emerald-300/10 text-emerald-100',
          )}
          >
            {step.broadcast ? '广播' : step.direction === 'local' ? '本地' : '单播'}
          </span>
        </div>
        <h2 className="font-display text-3xl font-bold leading-tight text-slate-50">{step.title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">{packetSummary}</p>
      </header>

      <section className="mt-6 border-t border-slate-800/80 pt-5">
        <div className="grid gap-2">
          <div className="font-mono-data text-xs uppercase tracking-[0.22em] text-cyan-200">通信方向</div>
          <div className="font-display break-words text-2xl font-bold text-white">{directionText}</div>
          <p className="text-sm leading-6 text-slate-300">{step.explanation}</p>
        </div>
      </section>

      <section className="mt-6 border-t border-slate-800/80 pt-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-100">报文核心字段</h3>
        <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
          {fieldRows.map(([key, value], index) => (
            <div
              key={key}
              className="packet-field-row grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-center gap-3 py-3 text-sm"
              style={{ '--field-delay': `${index * 46}ms` } as React.CSSProperties}
            >
              <span className="truncate text-slate-400">{fieldLabels[key] ?? key}</span>
              <span className="font-mono-data break-words text-right text-cyan-100">{String(value ?? '-')}</span>
            </div>
          ))}
          {fieldRows.length === 0 && (
            <div className="py-3 text-center text-sm text-slate-500">
              当前步骤没有需要展开的报文字段
            </div>
          )}
        </div>
      </section>

      {(step.clientState || step.serverState) && (
        <section className="mt-6 border-t border-slate-800/80 pt-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-100">TCP 状态</h3>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="border-l border-violet-300/40 pl-4">
              <div className="text-xs text-violet-200">客户端</div>
              <div className="font-mono-data mt-2 text-sm text-white">{step.clientState ?? '-'}</div>
            </div>
            <div className="border-l border-cyan-300/40 pl-4">
              <div className="text-xs text-cyan-200">服务器</div>
              <div className="font-mono-data mt-2 text-sm text-white">{step.serverState ?? '-'}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {tcpStates.map((state) => {
              const active = state === step.clientState || state === step.serverState
              return (
                <span
                  key={state}
                  className={cn(
                    'font-mono-data rounded-full border px-2.5 py-1 text-[10px]',
                    active
                      ? 'border-cyan-300/70 bg-cyan-300/15 text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.16)]'
                      : 'border-slate-800 bg-slate-950/40 text-slate-500',
                  )}
                >
                  {state}
                </span>
              )
            })}
          </div>
        </section>
      )}

      {step.protocol !== 'DNS' && step.tables?.map((table) => (
        <section key={table.label} className="mt-6 border-t border-slate-800/80 pt-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-100">{formatTableLabel(table.label)}</h3>
          <div className="overflow-x-auto border-y border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400">
                <tr>
                  {table.columns.map((column) => (
                    <th key={column} className="px-3 py-2 font-medium">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.length === 0 ? (
                  <tr>
                    <td colSpan={table.columns.length} className="px-3 py-3 text-center text-slate-500">
                      暂无记录
                    </td>
                  </tr>
                ) : (
                  table.rows.map((row, index) => (
                    <tr key={`${table.label}-${index}`} className="live-table-row border-t border-slate-800/80">
                      {table.columns.map((column) => (
                        <td key={column} className="font-mono-data px-2 py-2 text-[11px] text-cyan-50">
                          {row[column]}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </aside>
  )
}

function formatDirection(step: SimulationStep) {
  return `${nodeLabels[step.fromNode] ?? step.fromNode} -> ${nodeLabels[step.toNode] ?? step.toNode}`
}

function formatPacketSummary(step: SimulationStep) {
  const queryName = step.packetFields['Query Name'] ?? step.packetFields['Resolved Domain']
  const question = step.packetFields.Question
  const answerIp = step.packetFields['Answer IP'] ?? step.packetFields['Destination IP']

  if (step.id === 'dns-03' && question) return `本地 DNS 向根 DNS 询问：${question}`
  if (step.id === 'dns-04') return `根 DNS 返回下一跳：${step.packetFields['Next DNS']}（${step.packetFields['Next DNS IP']}）`
  if (step.id === 'dns-05' && question) return `本地 DNS 向顶级域 DNS 询问：${question}`
  if (step.id === 'dns-06') return `顶级域 DNS 返回权威 DNS：${step.packetFields['Authoritative DNS']}（${step.packetFields['Authoritative DNS IP']}）`
  if (step.id === 'dns-07' && question) return `本地 DNS 向权威 DNS 询问最终 A 记录：${question}`
  if (step.id === 'dns-08') return `权威 DNS 返回 ${queryName} 的 A 记录：${answerIp}`
  if (step.id === 'dns-09') return `本地 DNS 把 ${queryName} -> ${answerIp} 返回给主机，并写入缓存`
  if (step.id === 'dns-10') return `主机拿到 IP 后直接连接 Web 服务器，链路不再经过 DNS 解析器`
  if (step.result?.value) return step.result.value
  return step.explanation
}

function formatTableLabel(label: string) {
  if (label === 'DNS Cache' || label === 'Local DNS Resolver Cache') return '本地 DNS 服务器缓存表'
  if (label === 'H1 ARP Table') return 'H1 ARP 表'
  if (label === 'Switch S MAC Table') return '交换机 S MAC 表'
  return label
}
