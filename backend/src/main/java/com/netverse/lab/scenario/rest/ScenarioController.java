package com.netverse.lab.scenario.rest;

import com.netverse.lab.protocol.domain.SimulationStep;
import com.netverse.lab.protocol.rest.ProtocolDtos.ScenarioRequest;
import com.netverse.lab.scenario.domain.WebVisitScenarioService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/scenarios")
class ScenarioController {
  private final WebVisitScenarioService service;

  ScenarioController(WebVisitScenarioService service) {
    this.service = service;
  }

  @PostMapping("/web-visit")
  List<SimulationStep> webVisit(@RequestBody(required = false) ScenarioRequest request) {
    return service.webVisit(request == null ? "www.abc.com" : request.domain());
  }
}
