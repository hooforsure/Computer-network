package com.netverse.lab.knowledge.rest;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public final class KnowledgeDtos {
  private KnowledgeDtos() {}

  public record KnowledgePointResponse(
      String id,
      String layer,
      String title,
      String category,
      String summary,
      String detail,
      Instant createdAt,
      Instant updatedAt
  ) {}

  public record KnowledgePointRequest(
      String id,
      @NotBlank(message = "layer is required") String layer,
      @NotBlank(message = "title is required") @Size(max = 120) String title,
      @NotBlank(message = "category is required") @Size(max = 64) String category,
      @NotBlank(message = "summary is required") @Size(max = 500) String summary,
      @NotBlank(message = "detail is required") String detail
  ) {}

  public record PageResponse<T>(
      List<T> content,
      int page,
      int size,
      long totalElements,
      int totalPages
  ) {}

  public record GraphResponse(List<GraphNode> nodes, List<GraphLink> links) {}

  public record GraphNode(String id, String label, String type, String layer, String category, KnowledgePointResponse point) {}

  public record GraphLink(String source, String target, String relationType) {}
}
