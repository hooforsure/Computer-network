package com.netverse.lab.protocol.domain;

import com.netverse.lab.protocol.rest.ProtocolDtos.DnsCacheResponse;
import com.netverse.lab.protocol.rest.ProtocolDtos.DnsResolveResponse;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static com.netverse.lab.protocol.domain.StepBuilder.step;

@Service
public class ProtocolSimulationService {
  private final DnsCacheRepository dnsCacheRepository;
  private final HostDnsCacheRepository hostDnsCacheRepository;
  private final SimulationLogRepository logRepository;

  public ProtocolSimulationService(
      DnsCacheRepository dnsCacheRepository,
      HostDnsCacheRepository hostDnsCacheRepository,
      SimulationLogRepository logRepository
  ) {
    this.dnsCacheRepository = dnsCacheRepository;
    this.hostDnsCacheRepository = hostDnsCacheRepository;
    this.logRepository = logRepository;
  }

  @Transactional
  public DnsResolveResponse resolveDns(String domain) {
    var normalized = normalizeDomain(domain);
    var hostCached = hostDnsCacheRepository.findById(normalized);
    var cached = dnsCacheRepository.findById(normalized);
    var cacheHit = hostCached.isPresent() || cached.isPresent();
    var ip = hostCached.map(HostDnsCacheEntity::getIp).orElse(cached.map(DnsCacheEntity::getIp).orElse(resolveDnsIp(normalized)));
    var cacheLayer = hostCached.isPresent() ? "host" : cached.isPresent() ? "resolver" : "miss";
    var rowsBefore = dnsCacheRepository.findAll(Sort.by("updatedAt").descending()).stream()
        .map(this::toCacheResponse)
        .toList();

    List<SimulationStep> steps;
    if (hostCached.isPresent()) {
      steps = hostCacheHitSteps(normalized, hostCached.get());
      logRepository.save(new SimulationLogEntity("DNS", "HOST_CACHE_HIT", normalized, ip));
    } else if (cached.isPresent()) {
      var resolverCached = cached.get();
      steps = resolverCacheHitSteps(normalized, resolverCached, rowsBefore);
      logRepository.save(new SimulationLogEntity("DNS", "RESOLVER_CACHE_HIT", normalized, ip));
    } else {
      var rowsAfter = new ArrayList<>(rowsBefore);
      rowsAfter.add(0, new DnsCacheResponse(normalized, ip, "300s", "resolver", Instant.now()));
      steps = dnsMissSteps(normalized, ip, rowsBefore, rowsAfter);
      logRepository.save(new SimulationLogEntity("DNS", "RESOLVE_STARTED", normalized, ip));
    }
    return new DnsResolveResponse(normalized, ip, cacheHit, cacheLayer, steps);
  }

  @Transactional
  public void commitDnsResolution(String domain) {
    var normalized = normalizeDomain(domain);
    var resolverCached = dnsCacheRepository.findById(normalized);
    if (resolverCached.isPresent()) {
      var entity = resolverCached.get();
      upsertHostCache(normalized, entity.getIp(), entity.getTtl(), "browser");
      logRepository.save(new SimulationLogEntity("DNS", "COMMIT_RESOLVER_HIT", normalized, entity.getIp()));
      return;
    }

    var ip = resolveDnsIp(normalized);
    dnsCacheRepository.save(new DnsCacheEntity(normalized, ip, 300, "resolver"));
    upsertHostCache(normalized, ip, 300, "browser");
    logRepository.save(new SimulationLogEntity("DNS", "COMMIT_RESOLVE", normalized, ip));
  }

  @Transactional(readOnly = true)
  public List<DnsCacheResponse> getDnsCache() {
    return dnsCacheRepository.findAll(Sort.by("updatedAt").descending()).stream().map(this::toCacheResponse).toList();
  }

  @Transactional(readOnly = true)
  public List<DnsCacheResponse> getHostDnsCache() {
    return hostDnsCacheRepository.findAll(Sort.by("updatedAt").descending()).stream().map(this::toCacheResponse).toList();
  }

  @Transactional
  public void clearDnsCache() {
    dnsCacheRepository.deleteAllInBatch();
    logRepository.save(new SimulationLogEntity("DNS", "CLEAR_RESOLVER_CACHE", "-", "Local DNS resolver cache cleared"));
  }

  @Transactional
  public void clearHostDnsCache() {
    hostDnsCacheRepository.deleteAllInBatch();
    logRepository.save(new SimulationLogEntity("DNS", "CLEAR_HOST_CACHE", "-", "Host-side DNS cache cleared"));
  }

  public List<SimulationStep> tcpHandshake(Integer clientSeq, Integer serverSeq) {
    return createTcpHandshakeSteps(clientSeq == null ? 1000 : clientSeq, serverSeq == null ? 5000 : serverSeq);
  }

  public List<SimulationStep> tcpRelease(Integer clientSeq, Integer serverSeq) {
    return createTcpReleaseSteps(clientSeq == null ? 1001 : clientSeq, serverSeq == null ? 5001 : serverSeq);
  }

  private List<SimulationStep> hostCacheHitSteps(String domain, HostDnsCacheEntity cached) {
    return List.of(
        step("dns-host-cache-hit-01", "主机缓存命中", "DNS", "HOST_CACHE_HIT")
            .direction("local")
            .visualMode("local-scan")
            .route("client", "cache", List.of("client", "cache"))
            .cameraFocus("client")
            .highlights(List.of("client", "cache"), List.of(List.of("client", "cache")))
            .fields(Map.of(
                "Query Name", domain,
                "Query Type", "A",
                "Lookup", "Browser Cache -> OS DNS Cache -> Hosts",
                "Cache Status", "HIT",
                "Answer IP", cached.getIp(),
                "TTL", cached.getTtl() + "s",
                "Source", cached.getSource()
            ))
            .result("主机缓存命中", domain + " -> " + cached.getIp(), "emerald")
            .teaching(List.of("主机侧缓存命中时，不会向本地 DNS 递归解析器发送 DNS 查询。"))
            .explanation("浏览器或操作系统侧已经保存该域名记录，主机可直接得到 IP。")
            .log("Host cache hit: " + domain + " -> " + cached.getIp())
            .build()
    );
  }

  private List<SimulationStep> resolverCacheHitSteps(String domain, DnsCacheEntity cached, List<DnsCacheResponse> cacheRows) {
    return List.of(
        step("dns-resolver-cache-hit-01", "检查主机缓存", "DNS", "CACHE_LOOKUP")
            .direction("local")
            .visualMode("local-scan")
            .route("client", "cache", List.of("client", "cache"))
            .cameraFocus("client")
            .highlights(List.of("client", "cache"), List.of(List.of("client", "cache")))
            .fields(Map.of(
                "Query Name", domain,
                "Query Type", "A",
                "Lookup", "Browser Cache -> OS DNS Cache -> Hosts",
                "Cache Status", "MISS",
                "Next Action", "Request Local DNS Resolver"
            ))
            .result("主机缓存未命中", "继续请求本地 DNS 服务器", "amber")
            .teaching(List.of("主机先检查浏览器缓存、操作系统 DNS 缓存和 Hosts。"))
            .explanation("主机侧没有记录，所以才会把递归查询交给配置好的本地 DNS。")
            .log("Host cache miss for " + domain)
            .build(),
        step("dns-resolver-cache-hit-02", "请求本地 DNS 并命中缓存", "DNS", "RESOLVER_CACHE_HIT")
            .direction("request")
            .route("client", "localDns", List.of("client", "localDns"))
            .cameraFocus("localDns")
            .highlights(List.of("client", "localDns"), List.of(List.of("client", "localDns")))
            .fields(Map.of(
                "Query Name", domain,
                "Query Type", "A",
                "Transport", "UDP/53",
                "Cache Status", "HIT",
                "Answer IP", cached.getIp(),
                "TTL", cached.getTtl() + "s"
            ))
            .result("本地 DNS 缓存命中", domain + " -> " + cached.getIp(), "emerald")
            .tables(List.of(dnsCacheTable(cacheRows)))
            .teaching(List.of("本地 DNS 命中后会跳过根 DNS、顶级域 DNS 和权威 DNS 查询。"))
            .explanation("本地 DNS 服务器缓存中已有该域名记录，因此直接返回 IP。")
            .log("Local DNS resolver cache hit: " + domain + " -> " + cached.getIp())
            .build(),
        step("dns-resolver-cache-hit-03", "本地 DNS 返回 IP 给主机", "DNS", "DNS_RESPONSE")
            .direction("response")
            .route("localDns", "client", List.of("localDns", "client"))
            .cameraFocus("client")
            .highlights(List.of("client", "localDns"), List.of(List.of("localDns", "client")))
            .fields(Map.of(
                "Query Name", domain,
                "Response Type", "A",
                "Answer IP", cached.getIp(),
                "TTL", cached.getTtl() + "s",
                "Cache Update", "Host-side cache may store the returned answer"
            ))
            .result("解析结果返回主机", domain + " -> " + cached.getIp(), "emerald")
            .teaching(List.of("本地 DNS 返回结果后，主机侧也可以在 TTL 内缓存该记录。"))
            .explanation("返回路径是本地 DNS 到主机；主机随后把结果写入自己的浏览器或 OS DNS 缓存。")
            .log("Local DNS -> Client: " + domain + " = " + cached.getIp())
            .build()
    );
  }

  private List<SimulationStep> dnsMissSteps(String domain, String ip, List<DnsCacheResponse> rowsBefore, List<DnsCacheResponse> rowsAfter) {
    var parts = parseDomain(domain);
    var tld = parts.tld();
    var registeredDomain = parts.registeredDomain();
    var tldNsIp = "127.23.45.78";
    var authNsIp = domain.contains("baidu") ? "155.123.34.56" : "155.123.34.57";

    return List.of(
        step("dns-01", "检查主机缓存", "DNS", "CACHE_LOOKUP")
            .direction("local").visualMode("local-scan").route("client", "cache", List.of("client", "cache"))
            .cameraFocus("client").highlights(List.of("client", "cache"), List.of(List.of("client", "cache")))
            .fields(Map.of("Query Name", domain, "Query Type", "A", "Lookup", "Browser Cache -> OS DNS Cache -> Hosts", "Cache Status", "MISS", "Next Action", "Request Local DNS Resolver"))
            .result("主机缓存未命中", "需要请求本地 DNS 递归解析", "amber")
            .tables(List.of(dnsCacheTable(rowsBefore)))
            .teaching(List.of("主机侧缓存用于避免重复 DNS 查询。", "主机侧未命中后才会请求本地 DNS。"))
            .explanation("主机先检查浏览器缓存、操作系统 DNS 缓存和 Hosts；没有找到记录，所以继续请求本地 DNS。")
            .log("Host cache miss for " + domain).build(),
        step("dns-02", "请求本地 DNS", "DNS", "DNS_QUERY")
            .direction("request").route("client", "localDns", List.of("client", "localDns")).cameraFocus("localDns")
            .highlights(List.of("client", "localDns"), List.of(List.of("client", "localDns")))
            .fields(Map.of("Query Name", domain, "Query Type", "A", "Transport", "UDP/53", "Recursive Desired", true, "Expected Answer", "IPv4 address"))
            .result("解析器开始工作", "本地 DNS 开始递归查询", "cyan")
            .teaching(List.of("客户端通常只请求本地 DNS 递归解析器。", "DNS 标准查询常使用 UDP/53。"))
            .explanation("主机把递归查询交给配置好的本地 DNS，例如运营商 DNS 或公共 DNS。")
            .log("Client asks Local DNS for " + domain).build(),
        step("dns-03", "本地 DNS 询问根 DNS", "DNS", "DNS_QUERY")
            .direction("request").route("localDns", "rootDns", List.of("localDns", "rootDns")).cameraFocus("rootDns")
            .highlights(List.of("localDns", "rootDns"), List.of(List.of("localDns", "rootDns")))
            .fields(Map.of("Query Name", domain, "Query Type", "A", "Transport", "UDP/53", "Question", tld + " TLD DNS location", "Original QNAME", domain, "Resolver Goal", "Find " + tld + " TLD DNS"))
            .result("请求", "本地 DNS -> 根 DNS", "cyan")
            .teaching(List.of("根 DNS 不返回最终网站 IP。", "根 DNS 返回下一层顶级域 DNS 的位置。"))
            .explanation("本地 DNS 先询问根 DNS，根 DNS 返回负责该顶级域的 DNS 服务器信息。")
            .log("Local DNS -> Root DNS: A " + domain + "?").build(),
        step("dns-04", "根 DNS 返回顶级域 DNS", "DNS", "DNS_REFERRAL")
            .direction("response").route("rootDns", "localDns", List.of("rootDns", "localDns")).cameraFocus("localDns")
            .highlights(List.of("rootDns", "localDns", "tldDns"), List.of(List.of("rootDns", "localDns")))
            .fields(Map.of("Original Query", domain, "Referral Type", "NS + Glue", "Transport", "UDP/53", "Response Code", "NOERROR", "Next DNS", tld + " TLD DNS", "Next DNS IP", tldNsIp))
            .result("返回", tld + " TLD DNS -> " + tldNsIp, "amber")
            .teaching(List.of("Referral 响应告诉解析器下一步该问谁。"))
            .explanation("根 DNS 返回顶级域 DNS 及其地址，本地 DNS 因此知道下一步询问谁。")
            .log("Root DNS -> Local DNS: ask " + tld + " TLD DNS at " + tldNsIp).build(),
        step("dns-05", "本地 DNS 询问顶级域 DNS", "DNS", "DNS_QUERY")
            .direction("request").route("localDns", "tldDns", List.of("localDns", "tldDns")).cameraFocus("tldDns")
            .highlights(List.of("localDns", "tldDns"), List.of(List.of("localDns", "tldDns")))
            .fields(Map.of("Query Name", domain, "Query Type", "A", "Transport", "UDP/53", "Question", registeredDomain + " authoritative DNS location", "Original QNAME", domain, "Known TLD IP", tldNsIp))
            .result("请求", "本地 DNS -> " + tld + " 顶级域 DNS", "violet")
            .teaching(List.of("顶级域 DNS 负责对应后缀的命名空间。"))
            .explanation("本地 DNS 继续询问顶级域 DNS，目标是找到注册域名的权威 DNS。")
            .log("Local DNS -> TLD DNS: A " + domain + "?").build(),
        step("dns-06", "顶级域 DNS 返回权威 DNS", "DNS", "DNS_REFERRAL")
            .direction("response").route("tldDns", "localDns", List.of("tldDns", "localDns")).cameraFocus("localDns")
            .highlights(List.of("tldDns", "localDns", "authDns"), List.of(List.of("tldDns", "localDns")))
            .fields(Map.of("Original Query", domain, "Referral Type", "NS + Glue", "Transport", "UDP/53", "Response Code", "NOERROR", "Authoritative DNS", registeredDomain + " authoritative DNS", "Authoritative DNS IP", authNsIp))
            .result("返回", registeredDomain + " 权威 DNS -> " + authNsIp, "violet")
            .teaching(List.of("顶级域 DNS 仍不返回最终 IP，而是返回权威 DNS。"))
            .explanation("顶级域 DNS 返回负责该注册域名的权威 DNS，本地 DNS 继续向它查询最终记录。")
            .log("TLD DNS -> Local DNS: ask authority at " + authNsIp).build(),
        step("dns-07", "本地 DNS 询问权威 DNS", "DNS", "DNS_QUERY")
            .direction("request").route("localDns", "authDns", List.of("localDns", "authDns")).cameraFocus("authDns")
            .highlights(List.of("localDns", "authDns"), List.of(List.of("localDns", "authDns")))
            .fields(Map.of("Query Name", domain, "Query Type", "A", "Transport", "UDP/53", "Known Authority IP", authNsIp, "Question", "Final A record"))
            .result("请求", "本地 DNS -> 权威 DNS", "cyan")
            .teaching(List.of("权威 DNS 直接维护该区域的记录。"))
            .explanation("本地 DNS 向权威 DNS 查询精确 A 记录。")
            .log("Local DNS -> Authoritative DNS: A " + domain + "?").build(),
        step("dns-08", "权威 DNS 返回最终 IP", "DNS", "DNS_RESPONSE")
            .direction("response").route("authDns", "localDns", List.of("authDns", "localDns")).cameraFocus("localDns")
            .highlights(List.of("authDns", "localDns"), List.of(List.of("authDns", "localDns")))
            .fields(Map.of("Query Name", domain, "Response Type", "A", "Transport", "UDP/53", "Response Code", "NOERROR", "Answer IP", ip, "TTL", "300s"))
            .result("权威应答", domain + " -> " + ip, "emerald")
            .teaching(List.of("A 记录把域名映射到 IPv4 地址。", "TTL 决定缓存可复用多久。"))
            .explanation("权威 DNS 返回最终 IP，本地 DNS 获得可返回给主机的答案。")
            .log("Authoritative DNS -> Local DNS: " + domain + " = " + ip).build(),
        step("dns-09", "返回结果并写入缓存", "DNS", "DNS_RESPONSE")
            .direction("response").route("localDns", "client", List.of("localDns", "client"))
            .cameraFocus("client")
            .highlights(List.of("client", "cache", "localDns"), List.of(List.of("localDns", "client")))
            .fields(Map.of("Query Name", domain, "Response Type", "A", "Answer IP", ip, "TTL", "300s", "Cache Update", "Local DNS cache + host-side cache"))
            .result("最终解析结果", domain + " -> " + ip, "emerald")
            .tables(List.of(dnsCacheTable(rowsAfter)))
            .teaching(List.of("本地 DNS 持久化缓存；主机侧也可缓存返回结果。"))
            .explanation("本地 DNS 把最终 IP 返回给主机，同时更新自己的缓存；主机收到结果后写入浏览器或 OS DNS 缓存。")
            .log("Local DNS -> Client: " + domain + " = " + ip + "; caches updated").build(),
        step("dns-10", "主机连接 Web 服务器", "DNS", "CONNECT")
            .direction("connect").route("client", "webServer", List.of("client", "publicNet", "webServer")).cameraFocus("publicNet")
            .highlights(List.of("client", "publicNet", "webServer"), List.of(List.of("client", "publicNet"), List.of("publicNet", "webServer")))
            .fields(Map.of("Resolved Domain", domain, "Destination IP", ip, "Next Protocol", "TCP + HTTP/HTTPS", "Data Path", "Host -> Router/ISP -> Web Server", "DNS Resolver", "Not in later web traffic path", "Result", "Browser can visit the website"))
            .result("访问目标", ip, "emerald")
            .teaching(List.of("DNS 只负责解析地址，不是后续 Web 流量的中转节点。"))
            .explanation("DNS 解析完成后，主机以解析出的 IP 为目标，通过正常路由路径访问 Web 服务器。")
            .log("Browser -> router hops -> Web Server " + ip + "; DNS resolver is no longer in the path").build()
    );
  }

  private List<SimulationStep> createTcpHandshakeSteps(int clientSeq, int serverSeq) {
    return List.of(
        tcp("tcp-01", "SYN: client requests connection", "SYN", "client", "server", clientSeq, "-", "SYN", "SYN-SENT", "LISTEN", "1/3 handshake segments sent", "violet", "The client sends a SYN segment and enters SYN-SENT.", "Client -> Server: SYN seq=" + clientSeq),
        tcp("tcp-02", "SYN-ACK: server accepts", "SYN-ACK", "server", "client", serverSeq, clientSeq + 1, "SYN, ACK", "SYN-SENT", "SYN-RECEIVED", "2/3 handshake segments sent", "cyan", "The server acknowledges the client SYN and sends its own SYN.", "Server -> Client: SYN-ACK seq=" + serverSeq + " ack=" + (clientSeq + 1)),
        tcp("tcp-03", "ACK: connection established", "ACK", "client", "server", clientSeq + 1, serverSeq + 1, "ACK", "ESTABLISHED", "ESTABLISHED", "TCP connection established", "emerald", "The client acknowledges the server SYN. Both endpoints enter ESTABLISHED.", "Client -> Server: ACK ack=" + (serverSeq + 1))
    );
  }

  private List<SimulationStep> createTcpReleaseSteps(int clientSeq, int serverSeq) {
    return List.of(
        tcp("tcp-fin-01", "FIN: client starts release", "FIN", "client", "server", clientSeq, serverSeq, "FIN, ACK", "FIN-WAIT-1", "ESTABLISHED", "Client half-close requested", "amber", "The client sends FIN to indicate it has no more data to send.", "Client -> Server: FIN seq=" + clientSeq),
        tcp("tcp-fin-02", "ACK: server confirms FIN", "ACK", "server", "client", serverSeq, clientSeq + 1, "ACK", "FIN-WAIT-2", "CLOSE-WAIT", "Client send direction closed", "amber", "The server acknowledges the FIN but may still send remaining data.", "Server -> Client: ACK ack=" + (clientSeq + 1)),
        tcp("tcp-fin-03", "FIN: server closes", "FIN", "server", "client", serverSeq, clientSeq + 1, "FIN, ACK", "FIN-WAIT-2", "LAST-ACK", "Server also requests close", "violet", "The server sends FIN when it is ready to close its side of the connection.", "Server -> Client: FIN seq=" + serverSeq),
        tcp("tcp-fin-04", "ACK: release complete", "ACK", "client", "server", clientSeq + 1, serverSeq + 1, "ACK", "TIME-WAIT", "CLOSED", "TCP connection released", "emerald", "The client acknowledges the server FIN and waits briefly before closing.", "Client -> Server: ACK ack=" + (serverSeq + 1))
    );
  }

  private SimulationStep tcp(String id, String title, String packetType, String from, String to, Object seq, Object ack, String flags, String clientState, String serverState, String result, String tone, String explanation, String log) {
    return step(id, title, "TCP", packetType)
        .route(from, to, List.of(from, to))
        .cameraFocus(to)
        .highlights(List.of("client", "server"), List.of(List.of(from, to)))
        .fields(Map.of("Seq", seq, "Ack", ack, "Flags", flags, "Window", from.equals("client") ? 64240 : 65535, "MSS", 1460, "Source Port", from.equals("client") ? 49152 : 80, "Destination Port", from.equals("client") ? 80 : 49152))
        .states(clientState, serverState)
        .result(packetType.equals("ACK") && "ESTABLISHED".equals(clientState) ? "Final result" : packetType.contains("FIN") ? "Release progress" : "Connection progress", result, tone)
        .teaching(List.of("TCP uses sequence and acknowledgement numbers to provide reliable byte-stream delivery.", "State changes explain why setup and release require multiple segments."))
        .explanation(explanation)
        .log(log)
        .build();
  }

  private SimulationStep.TableSnapshot dnsCacheTable(List<DnsCacheResponse> rows) {
    return new SimulationStep.TableSnapshot("Local DNS Resolver Cache", List.of("Domain", "IP", "TTL", "Source"),
        rows.stream().map(row -> Map.of("Domain", row.domain(), "IP", row.ip(), "TTL", row.ttl(), "Source", row.source())).toList());
  }

  private DnsCacheResponse toCacheResponse(DnsCacheEntity entity) {
    return new DnsCacheResponse(entity.getDomain(), entity.getIp(), entity.getTtl() + "s", entity.getSource(), entity.getCachedAt());
  }

  private DnsCacheResponse toCacheResponse(HostDnsCacheEntity entity) {
    return new DnsCacheResponse(entity.getDomain(), entity.getIp(), entity.getTtl() + "s", entity.getSource(), entity.getCachedAt());
  }

  private void upsertHostCache(String domain, String ip, Integer ttl, String source) {
    var cached = hostDnsCacheRepository.findById(domain);
    if (cached.isPresent()) {
      var entity = cached.get();
      entity.update(ip, ttl, source);
      hostDnsCacheRepository.save(entity);
      return;
    }
    hostDnsCacheRepository.save(new HostDnsCacheEntity(domain, ip, ttl, source));
  }

  private static String normalizeDomain(String domain) {
    var normalized = domain == null ? "" : domain.trim().toLowerCase();
    return normalized.isBlank() ? "www.abc.com" : normalized;
  }

  private static String resolveDnsIp(String domain) {
    if (domain.contains("baidu")) return "128.23.14.16";
    if (domain.contains("qq")) return "183.3.226.35";
    if (domain.contains("taobao")) return "140.205.94.189";
    if (domain.contains("abc")) return "203.0.113.10";
    return "93.184.216.34";
  }

  private static DomainParts parseDomain(String domain) {
    var parts = domain.split("\\.");
    var tld = parts.length > 0 ? "." + parts[parts.length - 1] : ".com";
    var registered = parts.length >= 2 ? parts[parts.length - 2] + "." + parts[parts.length - 1] : domain;
    return new DomainParts(tld, registered);
  }

  private record DomainParts(String tld, String registeredDomain) {}
}
