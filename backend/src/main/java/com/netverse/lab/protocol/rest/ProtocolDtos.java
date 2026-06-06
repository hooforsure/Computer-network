package com.netverse.lab.protocol.rest;

import com.netverse.lab.protocol.domain.SimulationStep;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.List;

public final class ProtocolDtos {
  private ProtocolDtos() {}

  public record DnsResolveRequest(@NotBlank(message = "domain is required") String domain) {}

  public record DnsCacheResponse(String domain, String ip, String ttl, String source, Instant cachedAt) {}

  public record DnsResolveResponse(String domain, String ip, boolean cacheHit, String cacheLayer, List<SimulationStep> steps) {}

  public record TcpRequest(Integer clientSeq, Integer serverSeq) {}

  public record ScenarioRequest(String domain) {}
}
