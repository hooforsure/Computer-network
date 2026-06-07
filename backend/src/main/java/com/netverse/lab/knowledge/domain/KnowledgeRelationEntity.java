package com.netverse.lab.knowledge.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "knowledge_relation")
public class KnowledgeRelationEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 64)
  private String sourceId;

  @Column(nullable = false, length = 64)
  private String targetId;

  @Column(nullable = false, length = 64)
  private String relationType;

  protected KnowledgeRelationEntity() {}

  public KnowledgeRelationEntity(String sourceId, String targetId, String relationType) {
    this.sourceId = sourceId;
    this.targetId = targetId;
    this.relationType = relationType;
  }

  public Long getId() { return id; }
  public String getSourceId() { return sourceId; }
  public String getTargetId() { return targetId; }
  public String getRelationType() { return relationType; }
}
