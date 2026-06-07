ALTER TABLE knowledge_relation
  ADD CONSTRAINT uk_knowledge_relation UNIQUE (source_id, target_id, relation_type);

INSERT INTO knowledge_relation (source_id, target_id, relation_type)
SELECT CONCAT('layer-', layer), id, 'has_knowledge_point'
FROM knowledge_point
ON DUPLICATE KEY UPDATE relation_type = VALUES(relation_type);

INSERT INTO knowledge_relation (source_id, target_id, relation_type) VALUES
('root', 'layer-应用层', 'contains'),
('root', 'layer-传输层', 'contains'),
('root', 'layer-网络层', 'contains'),
('root', 'layer-数据链路层', 'contains'),
('root', 'layer-物理层', 'contains')
ON DUPLICATE KEY UPDATE relation_type = VALUES(relation_type);
