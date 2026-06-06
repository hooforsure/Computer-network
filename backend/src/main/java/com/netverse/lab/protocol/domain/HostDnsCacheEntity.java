package com.netverse.lab.protocol.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "host_dns_cache")
public class HostDnsCacheEntity {
  @Id
  @Column(length = 255)
  private String domain;

  @Column(nullable = false, length = 64)
  private String ip;

  @Column(nullable = false)
  private Integer ttl;

  @Column(nullable = false, length = 64)
  private String source;

  @Column(nullable = false)
  private Instant cachedAt;

  @Column(nullable = false)
  private Instant updatedAt;

  protected HostDnsCacheEntity() {}

  public HostDnsCacheEntity(String domain, String ip, Integer ttl, String source) {
    this.domain = domain;
    this.ip = ip;
    this.ttl = ttl;
    this.source = source;
  }

  @PrePersist
  void prePersist() {
    var now = Instant.now();
    cachedAt = now;
    updatedAt = now;
  }

  @PreUpdate
  void preUpdate() {
    updatedAt = Instant.now();
  }

  public void update(String ip, Integer ttl, String source) {
    this.ip = ip;
    this.ttl = ttl;
    this.source = source;
  }

  public String getDomain() { return domain; }
  public String getIp() { return ip; }
  public Integer getTtl() { return ttl; }
  public String getSource() { return source; }
  public Instant getCachedAt() { return cachedAt; }
  public Instant getUpdatedAt() { return updatedAt; }
}
