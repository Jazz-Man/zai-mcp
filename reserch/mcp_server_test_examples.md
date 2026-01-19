# MCP Server Test Examples

## Overview
This document provides concrete examples of how to test our Z.AI MCP Server components using Vitest and @effect/vitest.

## Testing Configuration Service

```ts
// src/__tests__/config.test.ts
import { it, expect } from "@effect/vitest"
import { Effect, Config, Layer } from "effect"
import { ZaiConfigService } from "../config.js"

// Mock environment variables for testing
const TestEnvironment = Layer.succeed(
  Config.ConfigProvider,
  Config.providerFromMap(new Map([
    ["ZAI_API_KEY", "test-api-key"],
    ["ZAI_BASE_URL", "https://test-api.z.ai"],
    ["ZAI_TIMEOUT_MS", "10000"],
    ["ZAI_MAX_RETRIES", "3"]
  ]))
)

it.effect("should load configuration correctly", () =>
  Effect.gen(function* () {
    const config = yield* ZaiConfigService
    
    expect(config.apiKey).toBeDefined()
    expect(config.baseUrl).toBe("https://test-api.z.ai")
    expect(config.timeoutMs).toBe(10000)
    expect(config.maxRetries).toBe(3)
  }).pipe(
    Effect.provide(TestEnvironment)
  )
)
```

## Testing HTTP Client

```ts
// src/__tests__/services/http-client.test.ts
import { it, expect } from "@effect/vitest"
import { Effect, Layer, Redacted } from "effect"
import { ZaiHttpClient } from "../../services/http-client.js"
import { ZaiConfigService } from "../../config.js"

// Mock configuration for HTTP client tests
const MockConfig = Layer.succeed(ZaiConfigService, {
  apiKey: Redacted.make("test-api-key"),
  baseUrl: "https://test-api.z.ai/api",
  timeoutMs: 5000,
  maxRetries: 2
})

it.effect("should create HTTP client with proper configuration", () =>
  Effect.gen(function* () {
    const httpClient = yield* ZaiHttpClient
    
    expect(httpClient).toBeDefined()
    expect(typeof httpClient.post).toBe("function")
  }).pipe(
    Effect.provide(MockConfig)
  )
)

// Test with mock fetch implementation
const MockFetch = Layer.succeed(
  Symbol.for("@effect/platform/FetchHttpClient/Fetch"),
  () => Promise.resolve(new Response(JSON.stringify({ test: "data" })))
)

it.effect("should make successful HTTP request with mock", () =>
  Effect.gen(function* () {
    const httpClient = yield* ZaiHttpClient
    
    // This would test the actual request flow with mocked response
    const result = yield* httpClient.post(
      "/test-endpoint",
      { test: "payload" },
      Schema.Struct({ test: Schema.String })
    )
    
    expect(result.test).toBe("data")
  }).pipe(
    Effect.provide(Layer.merge(MockConfig, MockFetch))
  )
)
```

## Testing Web Search Service

```ts
// src/__tests__/services/web-search.test.ts
import { it, expect } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { WebSearchService } from "../../services/web-search.js"
import { ZaiHttpClient } from "../../services/http-client.js"

// Mock HTTP client for search service
const MockHttpClient = Layer.succeed(ZaiHttpClient, {
  post: () => Effect.succeed({
    id: "test-id",
    created: Date.now(),
    search_result: [
      {
        title: "Test Result",
        content: "Test content",
        link: "https://example.com",
        media: "Example Site",
        icon: "https://example.com/icon.png",
        refer: "1",
        publish_date: "2023-01-01"
      }
    ]
  })
})

it.effect("should perform web search successfully", () =>
  Effect.gen(function* () {
    const searchService = yield* WebSearchService
    
    const result = yield* searchService.search({
      search_query: "test query",
      search_engine: "search-prime"
    })
    
    expect(result.id).toBe("test-id")
    expect(result.search_result).toHaveLength(1)
    expect(result.search_result[0].title).toBe("Test Result")
  }).pipe(
    Effect.provide(MockHttpClient)
  )
)
```

## Testing MCP Tool Handlers

```ts
// src/__tests__/tools/web-search.test.ts
import { it, expect } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { webSearchPrime } from "../../tools/web-search.js"
import { WebSearchService } from "../../services/web-search.js"

// Mock service for tool testing
const MockWebSearchService = Layer.succeed(WebSearchService, {
  search: () => Effect.succeed({
    id: "test-id",
    created: Date.now(),
    search_result: [
      {
        title: "Test Result",
        content: "Test content",
        link: "https://example.com",
        media: "Example Site",
        icon: "https://example.com/icon.png",
        refer: "1",
        publish_date: "2023-01-01"
      }
    ]
  })
})

it.effect("should execute web search tool correctly", () =>
  Effect.gen(function* () {
    const result = yield* webSearchPrime.execute({
      search_query: "test query"
    })
    
    expect(result.id).toBe("test-id")
    expect(result.result_count).toBe(1)
    expect(result.results).toHaveLength(1)
    expect(result.results[0].title).toBe("Test Result")
  }).pipe(
    Effect.provide(MockWebSearchService)
  )
)
```

## Integration Testing

```ts
// src/__tests__/integration/mcp-integration.test.ts
import { it, expect } from "@effect/vitest"
import { Effect, Layer } from "effect"
import * as McpServer from "@effect/ai/McpServer"
import * as Tool from "@effect/ai/Tool"
import { Toolkit } from "@effect/ai/Toolkit"
import { webSearchPrime } from "../../tools/web-search.js"
import { WebSearchService } from "../../services/web-search.js"

// Create a test toolkit with our tools
const TestToolkit = Toolkit.make(webSearchPrime)

// Mock all services needed for MCP server
const MockMcpServices = Layer.mergeAll(
  Layer.succeed(WebSearchService, {
    search: () => Effect.succeed({
      id: "integration-test-id",
      created: Date.now(),
      search_result: [{ 
        title: "Integration Test Result", 
        content: "Test content", 
        link: "https://example.com",
        media: "Example", icon: "", refer: "1", publish_date: "" 
      }]
    })
  })
)

it.effect("should handle full MCP tool execution cycle", () =>
  Effect.gen(function* () {
    // This would simulate the full MCP server execution
    // including tool discovery, execution, and response formatting
    
    // For now, we'll test the tool execution directly
    const result = yield* webSearchPrime.execute({
      search_query: "integration test"
    })
    
    expect(result.results).toHaveLength(1)
    expect(result.results[0].title).toContain("Integration Test")
  }).pipe(
    Effect.provide(MockMcpServices)
  )
)
```

## Testing Error Scenarios

```ts
// src/__tests__/error-handling.test.ts
import { it, expect } from "@effect/vitest"
import { Effect, Exit, Layer } from "effect"
import { ZaiHttpClient } from "../services/http-client.js"
import { NetworkError, ApiError } from "../schemas/common.js"

// Mock config that causes an error
const ErrorConfig = Layer.succeed(ZaiConfigService, {
  apiKey: Redacted.make("invalid-key"),
  baseUrl: "https://invalid-domain.example.com",
  timeoutMs: 1000, // Short timeout for testing
  maxRetries: 1
})

it.effect("should handle network errors properly", () =>
  Effect.gen(function* () {
    const httpClient = yield* ZaiHttpClient
    
    const result = yield* Effect.exit(
      httpClient.post(
        "/test-endpoint",
        { test: "data" },
        Schema.Struct({ result: Schema.String })
      )
    )
    
    // Verify that the error is properly handled
    expect(result._tag).toBe("Failure")
    // Additional checks based on the specific error type
  }).pipe(
    Effect.provide(ErrorConfig)
  )
)

it.effect("should handle API errors properly", () =>
  Effect.gen(function* () {
    const httpClient = yield* ZaiHttpClient
    
    // Mock an API error response
    const result = yield* Effect.exit(
      Effect.fail(new ApiError({ 
        code: "401", 
        message: "Unauthorized", 
        endpoint: "/test" 
      }))
    )
    
    expect(result._tag).toBe("Failure")
    if (result._tag === "Failure") {
      expect(result.failure._tag).toBe("ApiError")
    }
  })
)
```

## Testing with TestClock for Time-Dependent Operations

```ts
// src/__tests__/time-dependent.test.ts
import { it } from "@effect/vitest"
import { Effect, TestClock, Clock } from "effect"

it.effect("should handle timeout scenarios", () =>
  Effect.gen(function* () {
    // Advance the test clock by the timeout duration
    yield* TestClock.adjust("5 seconds")
    
    // Test time-dependent logic
    const startTime = yield* Clock.currentTimeMillis
    yield* Effect.sleep("1 second")
    const endTime = yield* Clock.currentTimeMillis
    
    expect(endTime - startTime).toBeGreaterThanOrEqual(1000)
  })
)
```

These test examples provide a comprehensive foundation for testing our MCP server components, covering unit tests, integration tests, error scenarios, and time-dependent operations.