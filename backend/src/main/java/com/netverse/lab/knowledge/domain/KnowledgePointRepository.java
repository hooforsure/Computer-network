package com.netverse.lab.knowledge.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface KnowledgePointRepository extends JpaRepository<KnowledgePointEntity, String> {
  @Query("""
      select p from KnowledgePointEntity p
      where (:layer is null or p.layer = :layer)
        and (
          :keyword is null
          or lower(p.title) like lower(concat('%', :keyword, '%'))
          or lower(p.category) like lower(concat('%', :keyword, '%'))
          or lower(p.summary) like lower(concat('%', :keyword, '%'))
          or lower(p.detail) like lower(concat('%', :keyword, '%'))
        )
      order by p.layer asc, p.createdAt asc
      """)
  Page<KnowledgePointEntity> search(@Param("layer") String layer, @Param("keyword") String keyword, Pageable pageable);
}
