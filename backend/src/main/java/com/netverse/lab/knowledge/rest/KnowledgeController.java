package com.netverse.lab.knowledge.rest;

import com.netverse.lab.knowledge.domain.KnowledgeService;
import com.netverse.lab.knowledge.rest.KnowledgeDtos.GraphResponse;
import com.netverse.lab.knowledge.rest.KnowledgeDtos.KnowledgePointRequest;
import com.netverse.lab.knowledge.rest.KnowledgeDtos.KnowledgePointResponse;
import com.netverse.lab.knowledge.rest.KnowledgeDtos.PageResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/knowledge")
class KnowledgeController {
  private final KnowledgeService service;

  KnowledgeController(KnowledgeService service) {
    this.service = service;
  }

  @GetMapping("/points")
  PageResponse<KnowledgePointResponse> search(
      @RequestParam(required = false) String layer,
      @RequestParam(required = false) String keyword,
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "10") int size
  ) {
    return service.search(layer, keyword, page, size);
  }

  @GetMapping("/points/{id}")
  KnowledgePointResponse get(@PathVariable String id) {
    return service.get(id);
  }

  @PostMapping("/points")
  @ResponseStatus(HttpStatus.CREATED)
  KnowledgePointResponse create(@Valid @RequestBody KnowledgePointRequest request) {
    return service.create(request);
  }

  @PutMapping("/points/{id}")
  KnowledgePointResponse update(@PathVariable String id, @Valid @RequestBody KnowledgePointRequest request) {
    return service.update(id, request);
  }

  @DeleteMapping("/points/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  void delete(@PathVariable String id) {
    service.delete(id);
  }

  @GetMapping("/graph")
  GraphResponse graph() {
    return service.graph();
  }
}
