package com.netverse.lab.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

@Configuration
@EnableConfigurationProperties(WebConfig.CorsProperties.class)
class WebConfig implements WebMvcConfigurer {
  private final CorsProperties corsProperties;

  WebConfig(CorsProperties corsProperties) {
    this.corsProperties = corsProperties;
  }

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/api/**")
        .allowedOrigins(corsProperties.allowedOrigins().toArray(String[]::new))
        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
        .allowedHeaders("*");
  }

  @ConfigurationProperties(prefix = "netverse.cors")
  record CorsProperties(List<String> allowedOrigins) {
    CorsProperties {
      if (allowedOrigins == null || allowedOrigins.isEmpty()) {
        allowedOrigins = List.of("http://localhost:5173", "http://127.0.0.1:5173");
      }
    }
  }
}
