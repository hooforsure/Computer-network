package com.netverse.lab.protocol.domain;

import com.netverse.lab.protocol.domain.SimulationStep.ScenarioRequirement;
import com.netverse.lab.protocol.domain.SimulationStep.StepResult;
import com.netverse.lab.protocol.domain.SimulationStep.TableSnapshot;

import java.util.List;
import java.util.Map;

public final class StepBuilder {
  private String id;
  private String title;
  private String protocol;
  private String packetType;
  private String direction;
  private String visualMode;
  private String fromNode;
  private String toNode;
  private List<String> path = List.of();
  private Boolean broadcast;
  private String cameraFocus;
  private List<String> highlightNodes = List.of();
  private List<List<String>> highlightLinks = List.of();
  private Map<String, Object> packetFields = Map.of();
  private ScenarioRequirement requirement;
  private List<TableSnapshot> tables;
  private String clientState;
  private String serverState;
  private StepResult result;
  private List<String> teachingPoints;
  private String explanation;
  private String log;

  public static StepBuilder step(String id, String title, String protocol, String packetType) {
    var builder = new StepBuilder();
    builder.id = id;
    builder.title = title;
    builder.protocol = protocol;
    builder.packetType = packetType;
    return builder;
  }

  public StepBuilder direction(String direction) { this.direction = direction; return this; }
  public StepBuilder visualMode(String visualMode) { this.visualMode = visualMode; return this; }
  public StepBuilder route(String fromNode, String toNode, List<String> path) { this.fromNode = fromNode; this.toNode = toNode; this.path = path; return this; }
  public StepBuilder broadcast(Boolean broadcast) { this.broadcast = broadcast; return this; }
  public StepBuilder cameraFocus(String cameraFocus) { this.cameraFocus = cameraFocus; return this; }
  public StepBuilder highlights(List<String> nodes, List<List<String>> links) { this.highlightNodes = nodes; this.highlightLinks = links; return this; }
  public StepBuilder fields(Map<String, Object> fields) { this.packetFields = fields; return this; }
  public StepBuilder requirement(ScenarioRequirement requirement) { this.requirement = requirement; return this; }
  public StepBuilder tables(List<TableSnapshot> tables) { this.tables = tables; return this; }
  public StepBuilder states(String clientState, String serverState) { this.clientState = clientState; this.serverState = serverState; return this; }
  public StepBuilder result(String label, String value, String tone) { this.result = new StepResult(label, value, tone); return this; }
  public StepBuilder teaching(List<String> teachingPoints) { this.teachingPoints = teachingPoints; return this; }
  public StepBuilder explanation(String explanation) { this.explanation = explanation; return this; }
  public StepBuilder log(String log) { this.log = log; return this; }

  public SimulationStep build() {
    return new SimulationStep(
        id, title, protocol, packetType, direction, visualMode, fromNode, toNode, path, broadcast,
        cameraFocus, highlightNodes, highlightLinks, packetFields, requirement, tables,
        clientState, serverState, result, teachingPoints, explanation, log
    );
  }
}
