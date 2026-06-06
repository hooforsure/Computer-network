CREATE TABLE IF NOT EXISTS host_dns_cache (
  domain VARCHAR(255) PRIMARY KEY,
  ip VARCHAR(64) NOT NULL,
  ttl INT NOT NULL DEFAULT 300,
  source VARCHAR(64) NOT NULL DEFAULT 'browser',
  cached_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO host_dns_cache (domain, ip, ttl, source) VALUES
('localhost.test', '127.0.0.1', 300, 'hosts'),
('host.demo.test', '192.0.2.25', 300, 'browser')
ON DUPLICATE KEY UPDATE
  ip = VALUES(ip),
  ttl = VALUES(ttl),
  source = VALUES(source);
