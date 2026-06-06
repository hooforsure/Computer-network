package com.netverse.lab.protocol.rest;

import com.netverse.lab.protocol.domain.ProtocolSimulationService;
import com.netverse.lab.protocol.domain.SimulationStep;
import com.netverse.lab.protocol.rest.ProtocolDtos.DnsCacheResponse;
import com.netverse.lab.protocol.rest.ProtocolDtos.DnsResolveRequest;
import com.netverse.lab.protocol.rest.ProtocolDtos.DnsResolveResponse;
import com.netverse.lab.protocol.rest.ProtocolDtos.TcpRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
class ProtocolController {
  private final ProtocolSimulationService service;

  ProtocolController(ProtocolSimulationService service) {
    this.service = service;
  }

  @PostMapping("/dns/resolve")
  DnsResolveResponse resolveDns(@Valid @RequestBody DnsResolveRequest request) {
    return service.resolveDns(request.domain());
  }

  @PostMapping("/dns/commit")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  void commitDnsResolution(@Valid @RequestBody DnsResolveRequest request) {
    service.commitDnsResolution(request.domain());
  }

  @GetMapping("/dns/cache")
  List<DnsCacheResponse> dnsCache() {
    return service.getDnsCache();
  }

  @GetMapping("/dns/host-cache")
  List<DnsCacheResponse> hostDnsCache() {
    return service.getHostDnsCache();
  }

  @DeleteMapping("/dns/cache")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  void clearDnsCache() {
    service.clearDnsCache();
  }

  @DeleteMapping("/dns/host-cache")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  void clearHostDnsCache() {
    service.clearHostDnsCache();
  }

  @PostMapping("/tcp/handshake")
  List<SimulationStep> tcpHandshake(@RequestBody(required = false) TcpRequest request) {
    return service.tcpHandshake(request == null ? null : request.clientSeq(), request == null ? null : request.serverSeq());
  }

  @PostMapping("/tcp/release")
  List<SimulationStep> tcpRelease(@RequestBody(required = false) TcpRequest request) {
    return service.tcpRelease(request == null ? null : request.clientSeq(), request == null ? null : request.serverSeq());
  }
}
