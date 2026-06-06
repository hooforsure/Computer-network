CREATE TABLE IF NOT EXISTS knowledge_point (
  id VARCHAR(64) PRIMARY KEY,
  layer VARCHAR(32) NOT NULL,
  title VARCHAR(120) NOT NULL,
  category VARCHAR(64) NOT NULL,
  summary VARCHAR(500) NOT NULL,
  detail TEXT NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_knowledge_layer (layer),
  INDEX idx_knowledge_title (title)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS knowledge_relation (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  source_id VARCHAR(64) NOT NULL,
  target_id VARCHAR(64) NOT NULL,
  relation_type VARCHAR(64) NOT NULL,
  INDEX idx_relation_source (source_id),
  INDEX idx_relation_target (target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dns_record (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  domain VARCHAR(255) NOT NULL,
  record_type VARCHAR(16) NOT NULL,
  value VARCHAR(255) NOT NULL,
  ttl INT NOT NULL DEFAULT 300,
  description VARCHAR(500),
  UNIQUE KEY uk_dns_record (domain, record_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dns_cache (
  domain VARCHAR(255) PRIMARY KEY,
  ip VARCHAR(64) NOT NULL,
  ttl INT NOT NULL DEFAULT 300,
  source VARCHAR(64) NOT NULL DEFAULT 'resolver',
  cached_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS protocol_step_template (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  protocol VARCHAR(32) NOT NULL,
  scene VARCHAR(64) NOT NULL,
  step_order INT NOT NULL,
  title VARCHAR(160) NOT NULL,
  from_node VARCHAR(64),
  to_node VARCHAR(64),
  packet_type VARCHAR(64),
  description TEXT,
  UNIQUE KEY uk_protocol_step (protocol, scene, step_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS simulation_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  module VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  input_text VARCHAR(500) NOT NULL,
  result_text VARCHAR(500) NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_log_module_time (module, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
