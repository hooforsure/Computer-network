package com.netverse.lab.scenario.domain;

import com.netverse.lab.protocol.domain.SimulationStep;
import com.netverse.lab.protocol.domain.SimulationStep.ScenarioRequirement;
import com.netverse.lab.protocol.domain.SimulationStep.TableSnapshot;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

import static com.netverse.lab.protocol.domain.StepBuilder.step;

@Service
public class WebVisitScenarioService {
  private static final String H1_IP = "192.168.1.2";
  private static final String H1_MAC = "00-11-22-33-44-cc";
  private static final String DNS_IP = "192.168.1.126";
  private static final String DNS_MAC = "00-11-22-33-44-bb";
  private static final String ROUTER_IP = "192.168.1.1";
  private static final String ROUTER_MAC = "00-11-22-33-44-aa";
  private static final String WEB_IP = "203.0.113.10";

  public List<SimulationStep> webVisit(String domain) {
    var targetDomain = domain == null || domain.isBlank() ? "www.abc.com" : domain.trim().toLowerCase();
    return List.of(
        step("scn-00", "t0 初始状态", "HTTP", "IDLE")
            .direction("local").route("h1", "h1", List.of()).cameraFocus("switch")
            .fields(Map.of("Task", "H1 visits " + targetDomain, "Stop", "t1 = S first receives HTTP Ethernet frame", "H1 ARP", "empty", "S MAC Table", "empty"))
            .requirement(req("初始化题目给定状态，确认 H1 尚未拥有 DNS/Web/网关相关二层信息。", "本地状态", "H1", "无真实通信", "-", "-", H1_IP, targetDomain + "（尚未解析）", "无链路，t0 时刻尚未发送帧", "交换机 S 未收到任何帧，交换表为空", "无；S MAC 表为空", "无；H1 ARP 表为空", "用户访问 URL：" + targetDomain, "准备进入 DNS 服务器 MAC 查询阶段"))
            .tables(List.of(arpTable(List.of()), macTable(List.of()), deviceTable()))
            .result("Ready", "No frame has entered the switch yet", "cyan")
            .teaching(List.of("The scenario stops at t1, before the HTTP frame is forwarded out of S.", "H1 must learn the DNS MAC, resolve the Web IP, then learn the gateway MAC."))
            .explanation("Initial state: H1 ARP table and switch S MAC table are empty.").log("t0: H1 prepares to visit " + targetDomain).build(),
        step("scn-01", "ARP 广播：查询 DNS 服务器 MAC", "ARP", "ARP_REQUEST")
            .direction("request").broadcast(true).route("h1", "switch", List.of("h1", "switch", "dns")).cameraFocus("switch")
            .highlights(List.of("h1", "switch", "dns", "router", "h2"), List.of(List.of("h1", "switch"), List.of("switch", "dns"), List.of("switch", "router"), List.of("switch", "h2")))
            .fields(Map.of("Protocol", "ARP", "Type", "Broadcast", "Src MAC", H1_MAC, "Dst MAC", "FF-FF-FF-FF-FF-FF", "Src IP", H1_IP, "Target IP", DNS_IP, "Switch action", "learn cc -> port 4, flood"))
            .requirement(req("H1 需要向本地 DNS 服务器发送查询，但 ARP 表为空，因此先查询 DNS IP 对应的 MAC。", "广播", "H1（端口 4）", "同一 LAN 内所有设备；只有 DNS 会应答", H1_MAC, "FF-FF-FF-FF-FF-FF", H1_IP, DNS_IP, "H1 -> S；S 泛洪到端口 1(DNS)、2(R)、3(H2)", "S 从端口 4 收到帧，学习源 MAC：cc -> 4；广播帧泛洪到其它端口", "新增 cc -> 4", "无；H1 尚未收到 ARP 应答", "ARP Request: Who has " + DNS_IP + "? Tell " + H1_IP, "DNS、R、H2 都收到广播；等待 DNS 返回 ARP Reply"))
            .tables(List.of(arpTable(List.of()), macTable(List.of(row("MAC", "cc", "Port", "4", "Meaning", "H1 learned")))))
            .result("Switch learning", "S learns H1 MAC on port 4", "amber")
            .explanation("H1 broadcasts an ARP request for the local DNS server MAC.").log("H1 -> S: ARP Request for DNS IP").build(),
        step("scn-02", "DNS 单播 ARP 应答给 H1", "ARP", "ARP_REPLY")
            .direction("response").route("dns", "h1", List.of("dns", "switch", "h1")).cameraFocus("h1")
            .highlights(List.of("dns", "switch", "h1"), List.of(List.of("dns", "switch"), List.of("switch", "h1")))
            .fields(Map.of("Protocol", "ARP", "Type", "Unicast", "Src MAC", DNS_MAC, "Dst MAC", H1_MAC, "Src IP", DNS_IP, "Dst IP", H1_IP, "Switch action", "learn bb -> port 1, forward to cc -> port 4"))
            .requirement(req("DNS 告诉 H1：本地 DNS IP 对应的 MAC 是 bb，使 H1 可以单播发送 DNS 查询。", "单播", "本地 DNS 服务器（端口 1）", "H1（端口 4）", DNS_MAC, H1_MAC, DNS_IP, H1_IP, "DNS -> S -> H1", "S 从端口 1 学习 bb -> 1；查表找到 cc 在端口 4，定向转发", "新增 bb -> 1；已有 cc -> 4", "H1 新增 " + DNS_IP + " -> bb", "ARP Reply: " + DNS_IP + " is at " + DNS_MAC, "H1 已知道本地 DNS 服务器 MAC，可以封装 DNS 查询报文"))
            .tables(List.of(arpTable(List.of(row("IP", DNS_IP, "MAC", "bb", "Meaning", "DNS server"))), macTable(List.of(row("MAC", "cc", "Port", "4", "Meaning", "H1"), row("MAC", "bb", "Port", "1", "Meaning", "DNS")))))
            .result("H1 ARP update", DNS_IP + " -> bb", "emerald")
            .explanation("DNS replies with its MAC address. H1 can now send a DNS query frame.").log("DNS -> H1: ARP Reply").build(),
        step("scn-03", "H1 单播发送 DNS 查询", "DNS", "DNS_QUERY")
            .direction("request").route("h1", "dns", List.of("h1", "switch", "dns")).cameraFocus("dns")
            .highlights(List.of("h1", "switch", "dns"), List.of(List.of("h1", "switch"), List.of("switch", "dns")))
            .fields(Map.of("Protocol", "DNS over UDP/53", "Type", "Unicast", "Src MAC", H1_MAC, "Dst MAC", DNS_MAC, "Src IP", H1_IP, "Dst IP", DNS_IP, "Query", "A " + targetDomain))
            .requirement(req("H1 向本地 DNS 服务器询问 " + targetDomain + " 的 A 记录，获取 Web 公网 IP。", "单播", "H1（端口 4）", "本地 DNS 服务器（端口 1）", H1_MAC, DNS_MAC, H1_IP, DNS_IP, "H1 -> S -> DNS", "S 查表 bb -> 1，按端口 1 单播转发；交换表不变", "无新增；保持 cc -> 4、bb -> 1", "无新增；保持 DNS IP -> bb", "DNS Query: QTYPE=A, QNAME=" + targetDomain + ", UDP/53", "本地 DNS 收到查询，准备递归/迭代解析公网域名"))
            .tables(baseDnsTables()).result("DNS query", "H1 asks for " + targetDomain + " public IP", "cyan")
            .explanation("H1 sends a unicast DNS query to the local DNS server.").log("H1 -> DNS: A " + targetDomain + "?").build(),
        step("scn-04", "DNS 解析并返回 Web 公网 IP", "DNS", "DNS_RESPONSE")
            .direction("response").route("dns", "h1", List.of("dns", "internet", "dns", "switch", "h1")).cameraFocus("dns")
            .highlights(List.of("dns", "internet", "switch", "h1"), List.of(List.of("dns", "internet"), List.of("dns", "switch"), List.of("switch", "h1")))
            .fields(Map.of("Protocol", "DNS over UDP/53", "Type", "Unicast", "Src MAC", DNS_MAC, "Dst MAC", H1_MAC, "Src IP", DNS_IP, "Dst IP", H1_IP, "Answer", targetDomain + " -> " + WEB_IP))
            .requirement(req("本地 DNS 经过外部递归/迭代查询获得 Web 公网 IP，并把答案返回给 H1。", "单播", "本地 DNS 服务器", "H1", DNS_MAC, H1_MAC, DNS_IP, H1_IP, "DNS -> Internet(root/TLD/authority) -> DNS -> S -> H1", "S 查表 cc -> 4，向 H1 单播转发；交换表不变", "无新增；保持 cc -> 4、bb -> 1", "无新增；H1 仍只有 DNS IP -> bb", "DNS Response: " + targetDomain + " A " + WEB_IP, "H1 已知道 Web 公网 IP，但目标跨网段，下一步必须查询默认网关 MAC"))
            .tables(baseDnsTables()).result("Web IP known", targetDomain + " = " + WEB_IP, "emerald")
            .explanation("The local DNS server resolves the public IP and returns it to H1.").log("DNS -> H1: " + targetDomain + " = " + WEB_IP).build(),
        step("scn-05", "ARP 广播：查询网关 R 的 MAC", "ARP", "ARP_REQUEST")
            .direction("request").broadcast(true).route("h1", "switch", List.of("h1", "switch", "router")).cameraFocus("switch")
            .highlights(List.of("h1", "switch", "dns", "router", "h2"), List.of(List.of("h1", "switch"), List.of("switch", "dns"), List.of("switch", "router"), List.of("switch", "h2")))
            .fields(Map.of("Protocol", "ARP", "Type", "Broadcast", "Src MAC", H1_MAC, "Dst MAC", "FF-FF-FF-FF-FF-FF", "Src IP", H1_IP, "Target IP", ROUTER_IP, "Switch action", "broadcast flood, table unchanged"))
            .requirement(req("Web 公网 IP 不在本地网段内，H1 需要把二层目的 MAC 填为默认网关 R 的 MAC。", "广播", "H1（端口 4）", "同一 LAN 内所有设备；只有 Router R 会应答", H1_MAC, "FF-FF-FF-FF-FF-FF", H1_IP, ROUTER_IP, "H1 -> S；S 泛洪到端口 1(DNS)、2(R)、3(H2)", "S 收到广播帧后泛洪；源 MAC cc 已存在于端口 4", "无新增；保持 cc -> 4、bb -> 1", "无新增；等待 R 应答", "ARP Request: Who has " + ROUTER_IP + "? Tell " + H1_IP, "Router R 收到对自己 IP 的 ARP 请求，准备返回 MAC aa"))
            .tables(baseDnsTables()).result("Gateway lookup", "H1 needs R MAC for cross-subnet traffic", "amber")
            .explanation("H1 must learn the gateway MAC before sending a frame for an external IP.").log("H1 broadcasts ARP Request for " + ROUTER_IP).build(),
        step("scn-06", "路由器 R 单播 ARP 应答", "ARP", "ARP_REPLY")
            .direction("response").route("router", "h1", List.of("router", "switch", "h1")).cameraFocus("router")
            .highlights(List.of("router", "switch", "h1"), List.of(List.of("router", "switch"), List.of("switch", "h1")))
            .fields(Map.of("Protocol", "ARP", "Type", "Unicast", "Src MAC", ROUTER_MAC, "Dst MAC", H1_MAC, "Src IP", ROUTER_IP, "Dst IP", H1_IP, "Switch action", "learn aa -> 2, lookup cc -> 4"))
            .requirement(req("Router R 回复自己的内网口 MAC，H1 获得跨网段发送 HTTP 帧所需的二层目的地址。", "单播", "Router R（端口 2）", "H1（端口 4）", ROUTER_MAC, H1_MAC, ROUTER_IP, H1_IP, "R -> S -> H1", "S 从端口 2 学习 aa -> 2；查表 cc -> 4，向 H1 单播转发", "新增 aa -> 2；已有 cc -> 4、bb -> 1", "H1 新增 " + ROUTER_IP + " -> aa", "ARP Reply: " + ROUTER_IP + " is at " + ROUTER_MAC, "H1 同时拥有 Web 公网 IP 与网关 MAC，已可封装 HTTP 请求以太网帧"))
            .tables(finalTables()).result("Gateway MAC known", ROUTER_IP + " -> aa", "emerald")
            .explanation("The router replies. H1 now has both the Web IP and gateway MAC.").log("R -> H1: ARP Reply").build(),
        step("scn-07", "t1：S 收到 HTTP 以太网帧", "HTTP", "HTTP_FRAME")
            .direction("request").route("h1", "switch", List.of("h1", "switch")).cameraFocus("switch")
            .highlights(List.of("h1", "switch", "router"), List.of(List.of("h1", "switch"), List.of("switch", "router")))
            .fields(Map.of("t1 event", "S first receives HTTP Ethernet frame", "L4/App", "HTTP + TCP", "Src IP", H1_IP, "Dst IP", WEB_IP, "Src MAC", H1_MAC, "Dst MAC", ROUTER_MAC, "Switch action", "known unicast aa -> port 2"))
            .requirement(req("H1 封装 HTTP 请求。三层目的 IP 是 Web 公网 IP，二层目的 MAC 是网关 R 的 MAC；t1 在 S 收到该帧时达成。", "单播", "H1（端口 4）", "Switch S 收到帧；下一跳将是 Router R（端口 2）", H1_MAC, ROUTER_MAC, H1_IP, WEB_IP, "H1 -> S（t1）；随后 S 可按 aa -> 2 转发到 Router R", "S 从端口 4 收到 HTTP 以太网帧，查表 aa -> 2；题目在“第一次收到”时截止", "无新增；最终 cc -> 4、bb -> 1、aa -> 2", "无新增；最终 " + DNS_IP + " -> bb，" + ROUTER_IP + " -> aa", "Ethernet(dst=" + ROUTER_MAC + ", src=" + H1_MAC + ") / IP(dst=" + WEB_IP + ") / TCP / HTTP GET " + targetDomain, "t1 达成：DNS + 两次 ARP 已完成，HTTP 请求帧第一次进入交换机 S"))
            .tables(finalTables()).result("t1 reached", "The required process stops as S receives the HTTP frame", "emerald")
            .teaching(List.of("For a cross-subnet target, the IP destination remains the Web IP but the Ethernet destination MAC is the gateway MAC.", "H2 never sends traffic, so the switch never learns dd -> 3."))
            .explanation("At t1, switch S receives the HTTP Ethernet frame from H1 port 4; this is the task endpoint.").log("t1: HTTP Ethernet frame enters S from H1 port 4").build()
    );
  }

  private static ScenarioRequirement req(String purpose, String type, String source, String target, String srcMac, String dstMac, String srcIp, String dstIp, String path, String switchAction, String macChange, String arpChange, String payload, String endState) {
    return new ScenarioRequirement(purpose, type, source, target, srcMac, dstMac, srcIp, dstIp, path, switchAction, macChange, arpChange, payload, endState);
  }

  private static List<TableSnapshot> baseDnsTables() {
    return List.of(arpTable(List.of(row("IP", DNS_IP, "MAC", "bb", "Meaning", "DNS server"))), macTable(List.of(row("MAC", "cc", "Port", "4", "Meaning", "H1"), row("MAC", "bb", "Port", "1", "Meaning", "DNS"))));
  }

  private static List<TableSnapshot> finalTables() {
    return List.of(arpTable(List.of(row("IP", DNS_IP, "MAC", "bb", "Meaning", "DNS server"), row("IP", ROUTER_IP, "MAC", "aa", "Meaning", "gateway R"))), macTable(List.of(row("MAC", "cc", "Port", "4", "Meaning", "H1"), row("MAC", "bb", "Port", "1", "Meaning", "DNS"), row("MAC", "aa", "Port", "2", "Meaning", "Router R"))));
  }

  private static TableSnapshot arpTable(List<Map<String, String>> rows) {
    return new TableSnapshot("H1 ARP Table", List.of("IP", "MAC", "Meaning"), rows);
  }

  private static TableSnapshot macTable(List<Map<String, String>> rows) {
    return new TableSnapshot("Switch S MAC Table", List.of("MAC", "Port", "Meaning"), rows);
  }

  private static TableSnapshot deviceTable() {
    return new TableSnapshot("Device Parameters", List.of("Device", "IP", "MAC", "Switch Port"), List.of(
        row("Device", "H1", "IP", H1_IP + "/25", "MAC", H1_MAC, "Switch Port", "4"),
        row("Device", "Local DNS", "IP", DNS_IP + "/25", "MAC", DNS_MAC, "Switch Port", "1"),
        row("Device", "Router R", "IP", ROUTER_IP + "/25", "MAC", ROUTER_MAC, "Switch Port", "2")
    ));
  }

  private static Map<String, String> row(String k1, String v1, String k2, String v2, String k3, String v3) {
    return Map.of(k1, v1, k2, v2, k3, v3);
  }

  private static Map<String, String> row(String k1, String v1, String k2, String v2, String k3, String v3, String k4, String v4) {
    return Map.of(k1, v1, k2, v2, k3, v3, k4, v4);
  }
}
