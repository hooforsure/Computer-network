package com.netverse.lab.protocol.domain;

import java.util.List;
import java.util.Map;

public record SimulationStep(
    String id,
    String title,
    String protocol,
    String packetType,
    String direction,
    String visualMode,
    String fromNode,
    String toNode,
    List<String> path,
    Boolean broadcast,
    String cameraFocus,
    List<String> highlightNodes,
    List<List<String>> highlightLinks,
    Map<String, Object> packetFields,
    ScenarioRequirement requirement,
    List<TableSnapshot> tables,
    String clientState,
    String serverState,
    StepResult result,
    List<String> teachingPoints,
    String explanation,
    String log
) {
  public record TableSnapshot(String label, List<String> columns, List<Map<String, String>> rows) {}

  public record StepResult(String label, String value, String tone) {}

  public record ScenarioRequirement(
      String purpose,
      String communicationType,
      String source,
      String target,
      String sourceMac,
      String destinationMac,
      String sourceIp,
      String destinationIp,
      String topologyPath,
      String switchAction,
      String macTableChange,
      String arpTableChange,
      String framePayload,
      String endState
  ) {}
}
