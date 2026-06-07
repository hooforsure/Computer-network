package com.netverse.lab.knowledge.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface KnowledgeRelationRepository extends JpaRepository<KnowledgeRelationEntity, Long> {
  boolean existsBySourceIdAndTargetIdAndRelationType(String sourceId, String targetId, String relationType);

  List<KnowledgeRelationEntity> findByTargetId(String targetId);

  void deleteByTargetId(String targetId);
}
