USE netverse_lab;

INSERT INTO knowledge_point (id, layer, title, category, summary, detail) VALUES
('dns', '应用层', 'DNS 域名解析', '协议', '把域名解析为 IP 地址，包含缓存、递归/迭代和层次服务器。', 'DNS 查询通常使用 UDP 53。客户端先查本地缓存，再请求本地 DNS；本地 DNS 可向根、TLD、权威服务器逐级查询，最终返回 A/AAAA 等记录。'),
('http', '应用层', 'HTTP 请求与响应', '协议', '浏览器和 Web 服务器交换资源的应用层协议。', 'HTTP 请求由方法、URL、首部和可选主体组成；响应包含状态码、首部和响应体。HTTP 通常运行在 TCP 之上，HTTPS 还会经过 TLS。'),
('smtp', '应用层', 'SMTP / POP3 / IMAP / MIME', '协议', '电子邮件发送、接收和内容封装相关协议。', 'SMTP 用于发送邮件，POP3/IMAP 用于读取邮件，MIME 用于支持附件和多媒体内容。'),
('tcp-handshake', '传输层', 'TCP 三次握手', '协议机制', '通过 SYN、SYN-ACK、ACK 建立可靠连接。', '三次握手同步双方初始序列号，并让客户端和服务器状态从 CLOSED/LISTEN 进入 ESTABLISHED。'),
('tcp-release', '传输层', 'TCP 四次挥手', '协议机制', 'TCP 双向字节流需要分别关闭两个发送方向。', 'FIN 表示本端没有数据要发送；ACK 确认对方关闭请求。主动关闭方通常进入 TIME-WAIT，以处理延迟报文。'),
('udp', '传输层', 'UDP 用户数据报', '协议', '无连接、低开销、尽力而为的传输层协议。', 'UDP 不保证可靠性和顺序，但头部简单，适合 DNS、实时音视频、游戏等场景。'),
('ip-forwarding', '网络层', 'IP 分组转发', '核心机制', '路由器根据目的 IP 和路由表逐跳转发分组。', 'IP 层关注跨网络寻址，二层 MAC 地址只在当前链路有效。跨网段通信时，主机把二层帧发给默认网关。'),
('subnet', '网络层', '子网与默认网关', '概念', '主机用子网掩码判断目标是否在同一网络。', '若目标 IP 不在本地子网内，主机不会 ARP 目标主机 MAC，而是 ARP 默认网关 MAC。'),
('arp', '数据链路层', 'ARP 地址解析', '协议', '在同一局域网内把 IP 地址解析为 MAC 地址。', 'ARP Request 使用广播目的 MAC；目标主机返回单播 ARP Reply。主机会把 IP-MAC 映射写入 ARP 表。'),
('switch-learning', '数据链路层', '交换机 MAC 学习', '设备机制', '交换机根据进入帧的源 MAC 学习端口映射。', '交换机收到帧后学习源 MAC 所在端口；若目的 MAC 已知则单播转发，未知或广播则泛洪。'),
('ethernet-frame', '数据链路层', '以太网帧封装', '数据单位', '以太网帧承载上层 IP 分组并包含源/目的 MAC。', '在跨网段访问时，IP 目的地址是最终服务器，但以太网目的 MAC 是下一跳网关。'),
('bit-signal', '物理层', '比特与信号', '基础概念', '物理层负责把比特转换为电信号、光信号或无线电波。', '物理层定义接口、编码、调制和传输介质特性，是所有上层通信的基础。'),
('media', '物理层', '传输介质', '设备/介质', '双绞线、光纤和无线信道承载比特传输。', '不同介质在带宽、距离、抗干扰能力、成本方面不同，影响网络部署方案。')
ON DUPLICATE KEY UPDATE
  layer = VALUES(layer),
  title = VALUES(title),
  category = VALUES(category),
  summary = VALUES(summary),
  detail = VALUES(detail);

INSERT INTO knowledge_relation (source_id, target_id, relation_type) VALUES
('root', 'layer-应用层', 'contains'),
('root', 'layer-传输层', 'contains'),
('root', 'layer-网络层', 'contains'),
('root', 'layer-数据链路层', 'contains'),
('root', 'layer-物理层', 'contains')
ON DUPLICATE KEY UPDATE relation_type = VALUES(relation_type);

INSERT INTO knowledge_relation (source_id, target_id, relation_type)
SELECT CONCAT('layer-', layer), id, 'has_knowledge_point'
FROM knowledge_point
ON DUPLICATE KEY UPDATE relation_type = VALUES(relation_type);

INSERT INTO dns_record (domain, record_type, value, ttl, description) VALUES
('www.abc.com', 'A', '203.0.113.10', 300, 'Integrated scenario web server address'),
('www.baidu.com', 'A', '128.23.14.16', 300, 'DNS lab sample domain'),
('www.qq.com', 'A', '183.3.226.35', 300, 'DNS lab sample domain'),
('www.taobao.com', 'A', '140.205.94.189', 300, 'DNS lab sample domain')
ON DUPLICATE KEY UPDATE
  value = VALUES(value),
  ttl = VALUES(ttl),
  description = VALUES(description);

INSERT INTO protocol_step_template (protocol, scene, step_order, title, from_node, to_node, packet_type, description) VALUES
('DNS', 'resolve', 1, '检查本地缓存', 'client', 'cache', 'CACHE_LOOKUP', '客户端先检查浏览器、操作系统和 Hosts 缓存。'),
('DNS', 'resolve', 2, '请求本地 DNS', 'client', 'localDns', 'DNS_QUERY', '客户端把递归查询交给本地 DNS。'),
('TCP', 'handshake', 1, 'SYN', 'client', 'server', 'SYN', '客户端请求建立 TCP 连接。'),
('TCP', 'handshake', 2, 'SYN-ACK', 'server', 'client', 'SYN-ACK', '服务器确认并同步自己的序列号。'),
('TCP', 'handshake', 3, 'ACK', 'client', 'server', 'ACK', '客户端确认，连接建立。')
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  from_node = VALUES(from_node),
  to_node = VALUES(to_node),
  packet_type = VALUES(packet_type),
  description = VALUES(description);

INSERT INTO host_dns_cache (domain, ip, ttl, source) VALUES
('localhost.test', '127.0.0.1', 300, 'hosts'),
('host.demo.test', '192.0.2.25', 300, 'browser')
ON DUPLICATE KEY UPDATE
  ip = VALUES(ip),
  ttl = VALUES(ttl),
  source = VALUES(source);
