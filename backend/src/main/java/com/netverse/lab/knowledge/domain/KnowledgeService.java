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
  private final KnowledgeRelationRepository relationRepository;

  KnowledgeService(KnowledgePointRepository repository, KnowledgeRelationRepository relationRepository) {
    this.repository = repository;
    this.relationRepository = relationRepository;
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
    var saved = repository.save(entity);
    ensureLayerRelation(saved);
    return toResponse(saved);
  }

  @Transactional
  public KnowledgePointResponse update(String id, KnowledgePointRequest request) {
    var entity = repository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Knowledge point not found: " + id));
    var originalLayer = entity.getLayer();
    entity.update(request.layer(), request.title(), request.category(), request.summary(), request.detail());
    if (!originalLayer.equals(request.layer())) {
      relationRepository.deleteByTargetId(id);
    }
    ensureLayerRelation(entity);
    return toResponse(entity);
  }

  @Transactional
  public void delete(String id) {
    if (!repository.existsById(id)) throw new ResourceNotFoundException("Knowledge point not found: " + id);
    relationRepository.deleteByTargetId(id);
    repository.deleteById(id);
  }

  @Transactional
  public GraphResponse graph() {
    var points = repository.findAll(Sort.by("layer").ascending().and(Sort.by("title").ascending()));
    var pointIds = points.stream().map(KnowledgePointEntity::getId).collect(java.util.stream.Collectors.toSet());
    var nodes = new ArrayList<GraphNode>();
    var links = new ArrayList<GraphLink>();
    nodes.add(new GraphNode("root", "计算机网络", "root", null, null, null));

    for (String layer : LAYERS) {
      var layerId = "layer-" + layer;
      nodes.add(new GraphNode(layerId, layer, "layer", layer, null, null));
      ensureRelation("root", layerId, "contains");
    }

    for (KnowledgePointEntity point : points) {
      var node = new GraphNode(point.getId(), point.getTitle(), "point", point.getLayer(), point.getCategory(), toResponse(point));
      nodes.add(node);
      ensureLayerRelation(point);
    }

    relationRepository.findAll(Sort.by("sourceId").ascending().and(Sort.by("targetId").ascending())).stream()
        .filter(relation -> isKnownGraphEndpoint(relation.getSourceId(), pointIds) && isKnownGraphEndpoint(relation.getTargetId(), pointIds))
        .map(relation -> new GraphLink(relation.getSourceId(), relation.getTargetId(), relation.getRelationType()))
        .forEach(links::add);

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

  private void ensureLayerRelation(KnowledgePointEntity point) {
    ensureRelation("layer-" + point.getLayer(), point.getId(), "has_knowledge_point");
  }

  private void ensureRelation(String sourceId, String targetId, String relationType) {
    if (relationRepository.existsBySourceIdAndTargetIdAndRelationType(sourceId, targetId, relationType)) return;
    relationRepository.save(new KnowledgeRelationEntity(sourceId, targetId, relationType));
  }

  private static boolean isKnownGraphEndpoint(String id, java.util.Set<String> pointIds) {
    if ("root".equals(id)) return true;
    if (id != null && id.startsWith("layer-")) return LAYERS.contains(id.substring("layer-".length()));
    return pointIds.contains(id);
  }
}
