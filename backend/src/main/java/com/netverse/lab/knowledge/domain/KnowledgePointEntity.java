package com.netverse.lab.knowledge.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "knowledge_point")
public class KnowledgePointEntity {
  @Id
  private String id;

  @Column(nullable = false, length = 32)
  private String layer;

  @Column(nullable = false, length = 120)
  private String title;

  @Column(nullable = false, length = 64)
  private String category;

  @Column(nullable = false, length = 500)
  private String summary;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String detail;

  @Column(nullable = false)
  private Instant createdAt;

  @Column(nullable = false)
  private Instant updatedAt;

  protected KnowledgePointEntity() {}

  public KnowledgePointEntity(String id, String layer, String title, String category, String summary, String detail) {
    this.id = id == null || id.isBlank() ? "kp-" + UUID.randomUUID() : id;
    this.layer = layer;
    this.title = title;
    this.category = category;
    this.summary = summary;
    this.detail = detail;
  }

  @PrePersist
  void prePersist() {
    var now = Instant.now();
    createdAt = now;
    updatedAt = now;
  }

  @PreUpdate
  void preUpdate() {
    updatedAt = Instant.now();
  }

  public void update(String layer, String title, String category, String summary, String detail) {
    this.layer = layer;
    this.title = title;
    this.category = category;
    this.summary = summary;
    this.detail = detail;
  }

  public String getId() { return id; }
  public String getLayer() { return layer; }
  public String getTitle() { return title; }
  public String getCategory() { return category; }
  public String getSummary() { return summary; }
  public String getDetail() { return detail; }
  public Instant getCreatedAt() { return createdAt; }
  public Instant getUpdatedAt() { return updatedAt; }
}
