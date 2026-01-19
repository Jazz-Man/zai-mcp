# MCP Server Testing Strategy

## Overview
This document outlines a comprehensive testing strategy for the Z.AI MCP Server using Vitest and @effect/vitest, incorporating the patterns and best practices from the Effect-TS ecosystem.

## Testing Philosophy

### 1. Test Pyramid for Effect-TS Applications
- **Unit Tests**: Test individual Effect functions and services in isolation
- **Integration Tests**: Test the interaction between services and the MCP protocol
- **End-to-End Tests**: Test the complete MCP server workflow

### 2. Effect-Specific Testing Patterns
- Use `it.effect` for Effect-based tests with automatic TestContext
- Leverage `Effect.exit` to test both success and failure cases
- Use `TestClock` for time-dependent operations
- Utilize Layer composition for dependency injection in tests

## Testing Levels

### 1. Unit Testing

#### Service Layer Testing
```ts
// Testing individual service methods
it.effect("should perform search with correct parameters", () =>
  Effect.gen(function* () {
    const service = yield* WebSearchService
    
    const result = yield* service.search({
      search_query: "test query",
      count: Option.some(5)
    })
    
    expect(result.search_result).toHaveLength(5)
  })
)
```

#### HTTP Client Testing
```ts
// Testing HTTP client with mock responses
it.effect("should handle successful API responses", () =>
  Effect.gen(function* () {
    const client = yield* ZaiHttpClient
    
    const result = yield* client.post(
      "/test-endpoint",
      { test: "data" },
      Schema.Struct({ success: Schema.Boolean })
    )
    
    expect(result.success).toBe(true)
  })
)
```

#### Schema Validation Testing
```ts
// Testing schema validation
it.effect("should validate request/response schemas correctly", () =>
  Effect.gen(function* () {
    // Test that schemas properly validate data
    const validData = { search_query: "valid query" }
    const result = yield* Schema.decode(WebSearchParamsSchema)(validData)
    
    expect(result.search_query).toBe("valid query")
  })
)
```

### 2. Integration Testing

#### Tool-Service Integration
```ts
// Testing MCP tool integration with underlying services
it.effect("should execute tool with service integration", () =>
  Effect.gen(function* () {
    const result = yield* webSearchPrime.execute({
      search_query: "integration test"
    })
    
    expect(result.results).toBeArray()
    expect(result.result_count).toBeGreaterThan(0)
  })
)
```

#### MCP Protocol Testing
```ts
// Testing MCP protocol compliance
it.effect("should handle MCP tool discovery", () =>
  Effect.gen(function* () {
    // Test that tools are properly registered and discoverable
    // This would involve testing the MCP server's tool listing functionality
  })
)
```

### 3. Error Testing

#### Network Error Handling
```ts
// Testing network error scenarios
it.effect("should handle network timeouts gracefully", () =>
  Effect.gen(function* () {
    const result = yield* Effect.exit(
      // Simulate a timeout scenario
    )
    
    expect(result._tag).toBe("Failure")
  })
)
```

#### API Error Handling
```ts
// Testing API-specific error responses
it.effect("should handle API error responses", () =>
  Effect.gen(function* () {
    const result = yield* Effect.exit(
      // Simulate an API error response
    )
    
    expect(result._tag).toBe("Failure")
  })
)
```

## Testing Utilities

### 1. Test Helpers
```ts
// Create reusable test helpers
const withMockConfig = (config: Partial<ZaiConfig>) =>
  Layer.succeed(ZaiConfigService, {
    apiKey: Redacted.make("test-key"),
    baseUrl: "https://test-api.z.ai/api",
    timeoutMs: 5000,
    maxRetries: 3,
    ...config
  })

const withMockHttpClient = (responses: Record<string, any>) =>
  Layer.succeed(ZaiHttpClient, {
    post: (endpoint, body, schema) => 
      Effect.succeed(responses[endpoint] || { error: "Not mocked" })
  })
```

### 2. Test Fixtures
```ts
// Define common test data
const TEST_SEARCH_PARAMS = {
  search_query: "test query",
  count: Option.some(10),
  search_domain_filter: Option.none(),
  search_recency_filter: Option.none()
}

const MOCK_SEARCH_RESPONSE = {
  id: "test-id",
  created: Date.now(),
  search_result: [
    {
      title: "Test Result",
      content: "Test content summary",
      link: "https://example.com",
      media: "Example Site",
      icon: "https://example.com/icon.png",
      refer: "1",
      publish_date: "2023-01-01"
    }
  ]
}
```

## Testing Configuration

### 1. Vitest Configuration
```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'reserch'],
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts']
  }
})
```

### 2. Test Environment Setup
```ts
// vitest.setup.ts
import { vi } from 'vitest'

// Setup any global test utilities
vi.stubGlobal('setTimeout', (fn: Function, ms: number) => {
  // Custom timeout implementation for testing
  return setTimeout(fn, ms)
})
```

## Continuous Testing Practices

### 1. Test Coverage
- Aim for 80%+ coverage on critical business logic
- Focus on testing Effect compositions and error handling
- Measure coverage specifically for service and tool layers

### 2. Test Organization
- Group tests by feature/module
- Use descriptive test names
- Separate unit and integration tests
- Maintain fast-running unit tests (< 100ms per test)

### 3. Mocking Strategy
- Mock external API calls
- Use Layer for dependency injection
- Create realistic mock responses
- Test with both successful and error scenarios

## MCP-Specific Testing Considerations

### 1. Protocol Compliance
- Test MCP tool registration and discovery
- Verify proper error handling in MCP protocol
- Test tool parameter validation
- Validate response formatting

### 2. Performance Testing
- Test concurrent tool executions
- Measure response times under load
- Test memory usage patterns
- Verify proper resource cleanup

### 3. Security Testing
- Test API key handling
- Validate input sanitization
- Test rate limiting (if applicable)
- Verify proper authentication flows

## Quality Gates

### 1. Test Requirements
- All new features must include unit tests
- Error scenarios must be tested
- Integration points must be verified
- Performance benchmarks must be met

### 2. CI/CD Integration
- Run tests on every commit
- Block merges if tests fail
- Report coverage metrics
- Run integration tests in staging

This testing strategy ensures comprehensive coverage of our MCP server functionality while leveraging the power of Effect-TS testing utilities.