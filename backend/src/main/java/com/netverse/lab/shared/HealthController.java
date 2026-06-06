package com.netverse.lab.shared;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api")
class HealthController {
  @GetMapping("/health")
  Map<String, Object> health() {
    return Map.of(
        "status", "UP",
        "service", "NetVerse Protocol Lab",
        "time", Instant.now()
    );
  }
}
