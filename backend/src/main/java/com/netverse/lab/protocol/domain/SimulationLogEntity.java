package com.netverse.lab.protocol.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "simulation_log")
public class SimulationLogEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 64)
  private String module;

  @Column(nullable = false, length = 64)
  private String action;

  @Column(nullable = false, length = 500)
  private String inputText;

  @Column(nullable = false, length = 500)
  private String resultText;

  @Column(nullable = false)
  private Instant createdAt;

  protected SimulationLogEntity() {}

  public SimulationLogEntity(String module, String action, String inputText, String resultText) {
    this.module = module;
    this.action = action;
    this.inputText = inputText;
    this.resultText = resultText;
  }

  @PrePersist
  void prePersist() {
    createdAt = Instant.now();
  }
}
