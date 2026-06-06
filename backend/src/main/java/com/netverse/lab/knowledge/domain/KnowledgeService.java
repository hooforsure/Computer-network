package com.netverse.lab.knowledge.domain;

import com.netverse.lab.knowledge.rest.KnowledgeDtos.GraphLink;
import com.netverse.lab.knowledge.rest.KnowledgeDtos.GraphNode;
import com.netverse.lab.knowledge.rest.KnowledgeDtos.GraphResponse;
import com.netverse.lab.knowledge.rest.KnowledgeDtos.KnowledgePointRequest;
import com.netverse.lab.knowledge.rest.KnowledgeDtos.KnowledgePointResponse;
import com.netverse.lab.knowledge.rest.KnowledgeDtos.PageResponse;
import com.netverse.lab.shared.ResourceNotFoundException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class KnowledgeService {
  private static final List<String> LAYERS = List.of("应用层", "传输层", "网络层", "数据链路层", "物理层");

  private final KnowledgePointRepository repository;

  KnowledgeService(KnowledgePointRepository repository) {
    this.repository = repository;
  }

  @Transactional(readOnly = true)
  public PageResponse<KnowledgePointResponse> search(String layer, String keyword, int page, int size) {
    var normalizedLayer = blankToNull(layer);
    var normalizedKeyword = blankToNull(keyword);
    var pageable = PageRequest.of(Math.max(page - 1, 0), Math.max(1, Math.min(size, 50)), Sort.by("createdAt").ascending());
    var result = repository.search(normalizedLayer, normalizedKeyword, pageable).map(this::toResponse);
    return new PageResponse<>(result.getContent(), page, size, result.getTotalElements(), result.getTotalPages());
  }

  @Transactional(readOnly = true)
  public KnowledgePointResponse get(String id) {
    return repository.findById(id).map(this::toResponse)
        .orElseThrow(() -> new ResourceNotFoundException("Knowledge point not found: " + id));
  }

  @Transactional
  public KnowledgePointResponse create(KnowledgePointRequest request) {
    var entity = new KnowledgePointEntity(
        request.id(),
        request.layer(),
        request.title(),
        request.category(),
        request.summary(),
        request.detail()
    );
    return toResponse(repository.save(entity));
  }

  @Transactional
  public KnowledgePointResponse update(String id, KnowledgePointRequest request) {
    var entity = repository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Knowledge point not found: " + id));
    entity.update(request.layer(), request.title(), request.category(), request.summary(), request.detail());
    return toResponse(entity);
  }

  @Transactional
  public void delete(String id) {
    if (!repository.existsById(id)) throw new ResourceNotFoundException("Knowledge point not found: " + id);
    repository.deleteById(id);
  }

  @Transactional(readOnly = true)
  public GraphResponse graph() {
    var points = repository.findAll(Sort.by("layer").ascending().and(Sort.by("title").ascending()));
    var nodes = new ArrayList<GraphNode>();
    var links = new ArrayList<GraphLink>();
    nodes.add(new GraphNode("root", "计算机网络", "root", null, null, null));

    for (String layer : LAYERS) {
      var layerId = "layer-" + layer;
      nodes.add(new GraphNode(layerId, layer, "layer", layer, null, null));
      links.add(new GraphLink("root", layerId, "contains"));
    }

    for (KnowledgePointEntity point : points) {
      var node = new GraphNode(point.getId(), point.getTitle(), "point", point.getLayer(), point.getCategory(), toResponse(point));
      nodes.add(node);
      links.add(new GraphLink("layer-" + point.getLayer(), point.getId(), "has_knowledge_point"));
    }

    return new GraphResponse(nodes, links);
  }

  private KnowledgePointResponse toResponse(KnowledgePointEntity entity) {
    return new KnowledgePointResponse(
        entity.getId(),
        entity.getLayer(),
        entity.getTitle(),
        entity.getCategory(),
        entity.getSummary(),
        entity.getDetail(),
        entity.getCreatedAt(),
        entity.getUpdatedAt()
    );
  }

  private static String blankToNull(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }
}
