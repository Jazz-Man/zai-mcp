# Web Reader MCP Tool Tests

## Overview
This document provides specific test examples for the Web Reader MCP tool that we plan to implement, following the testing patterns established with @effect/vitest.

## Web Reader Service Tests

### 1. Basic Service Functionality
```ts
// src/__tests__/services/web-reader.test.ts
import { it, expect } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { WebReaderService } from "../../services/web-reader.js"
import { ZaiHttpClient } from "../../services/http-client.js"

// Mock HTTP client for Web Reader
const MockWebReaderHttpClient = Layer.succeed(ZaiHttpClient, {
  post: (endpoint, body, schema) => {
    if (endpoint === "/coding/paas/v4/reader") {
      return Effect.succeed({
        id: "web-reader-test-id",
        created: Date.now(),
        request_id: "test-request-id",
        model: "web-reader-model",
        reader_result: {
          content: "# Test Page Content\nThis is the main content of the test page.",
          description: "Test page description",
          title: "Test Page Title",
          url: "https://example.com",
          external: {
            stylesheet: {}
          },
          metadata: {
            keywords: "test, example",
            viewport: "width=device-width",
            description: "Test page meta description",
            "format-detection": "telephone=no"
          }
        }
      })
    }
    return Effect.fail(new Error(`Unexpected endpoint: ${endpoint}`))
  }
})

it.effect("should read web content successfully", () =>
  Effect.gen(function* () {
    const webReaderService = yield* WebReaderService
    
    const result = yield* webReaderService.read({
      url: "https://example.com"
    })
    
    expect(result.id).toBe("web-reader-test-id")
    expect(result.reader_result.title).toBe("Test Page Title")
    expect(result.reader_result.content).toContain("Test Page Content")
    expect(result.reader_result.url).toBe("https://example.com")
  }).pipe(
    Effect.provide(MockWebReaderHttpClient)
  )
)

it.effect("should handle all optional parameters", () =>
  Effect.gen(function* () {
    const webReaderService = yield* WebReaderService
    
    const result = yield* webReaderService.read({
      url: "https://example.com",
      timeout: 30,
      no_cache: true,
      return_format: "markdown",
      retain_images: false,
      no_gfm: true,
      keep_img_data_url: false,
      with_images_summary: true,
      with_links_summary: true
    })
    
    expect(result.reader_result).toBeDefined()
    expect(result.reader_result.title).toBe("Test Page Title")
  }).pipe(
    Effect.provide(MockWebReaderHttpClient)
  )
)
```

### 2. Error Handling Tests
```ts
it.effect("should handle invalid URL error", () =>
  Effect.gen(function* () {
    const webReaderService = yield* WebReaderService
    
    const result = yield* Effect.exit(
      webReaderService.read({
        url: "invalid-url"
      })
    )
    
    expect(result._tag).toBe("Failure")
  }).pipe(
    Effect.provide(MockWebReaderHttpClient)
  )
)

it.effect("should handle network errors", () =>
  Effect.gen(function* () {
    // Mock a network error
    const errorHttpClient = Layer.succeed(ZaiHttpClient, {
      post: () => Effect.fail(new Error("Network error"))
    })
    
    const webReaderService = yield* WebReaderService
    
    const result = yield* Effect.exit(
      webReaderService.read({
        url: "https://example.com"
      })
    )
    
    expect(result._tag).toBe("Failure")
  })
)
```

## Web Reader Tool Tests

### 1. MCP Tool Functionality
```ts
// src/__tests__/tools/web-reader.test.ts
import { it, expect } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { webReader } from "../../tools/web-reader.js"
import { WebReaderService } from "../../services/web-reader.js"

// Mock service for tool testing
const MockWebReaderService = Layer.succeed(WebReaderService, {
  read: (params) => Effect.succeed({
    id: "tool-test-id",
    created: Date.now(),
    request_id: "tool-request-id",
    model: "tool-model",
    reader_result: {
      content: "# Tool Test Content\nContent read by the tool.",
      description: "Tool test description",
      title: "Tool Test Page",
      url: params.url,
      external: { stylesheet: {} },
      metadata: { 
        keywords: "tool, test", 
        description: "Tool test meta" 
      }
    }
  })
})

it.effect("should execute web reader tool with minimal parameters", () =>
  Effect.gen(function* () {
    const result = yield* webReader.execute({
      url: "https://example.com"
    })
    
    expect(result.id).toBe("tool-test-id")
    expect(result.title).toBe("Tool Test Page")
    expect(result.content).toContain("Tool Test Content")
    expect(result.url).toBe("https://example.com")
  }).pipe(
    Effect.provide(MockWebReaderService)
  )
)

it.effect("should execute web reader tool with all parameters", () =>
  Effect.gen(function* () {
    const result = yield* webReader.execute({
      url: "https://example.com",
      timeout: 25,
      no_cache: true,
      return_format: "markdown",
      retain_images: false,
      no_gfm: false,
      keep_img_data_url: false,
      with_images_summary: true,
      with_links_summary: false
    })
    
    expect(result.title).toBe("Tool Test Page")
    expect(result.content).toContain("Tool Test Content")
  }).pipe(
    Effect.provide(MockWebReaderService)
  )
)
```

### 2. Parameter Validation Tests
```ts
it.effect("should validate required url parameter", () =>
  Effect.gen(function* () {
    try {
      // This should fail validation before reaching the service
      yield* webReader.execute({} as any) // Force type error for testing
    } catch (error) {
      expect(error).toBeDefined()
    }
  })
)

it.effect("should handle unsupported return formats", () =>
  Effect.gen(function* () {
    const result = yield* webReader.execute({
      url: "https://example.com",
      return_format: "html" // Assuming html is not supported
    })
    
    // Verify the service handles unsupported formats appropriately
    expect(result).toBeDefined()
  }).pipe(
    Effect.provide(MockWebReaderService)
  )
)
```

## Integration Tests

### 1. End-to-End Web Reading Flow
```ts
// src/__tests__/integration/web-reader-flow.test.ts
import { it, expect } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { webReader } from "../../tools/web-reader.js"
import { WebReaderService } from "../../services/web-reader.js"
import { ZaiHttpClient } from "../../services/http-client.js"
import { ZaiConfigService } from "../../config.js"

// Complete mock layer for the entire flow
const CompleteWebReaderMock = Layer.mergeAll(
  Layer.succeed(ZaiConfigService, {
    apiKey: Redacted.make("test-key"),
    baseUrl: "https://api.z.ai/api/coding",
    timeoutMs: 10000,
    maxRetries: 3
  }),
  Layer.succeed(ZaiHttpClient, {
    post: (endpoint, body, schema) => {
      // Simulate the actual Web Reader API response
      if (endpoint === "/coding/paas/v4/reader") {
        // Validate the request body contains expected parameters
        expect(body.url).toMatch(/^https?:\/\//)
        
        return Effect.succeed({
          id: `test-${Date.now()}`,
          created: Date.now(),
          request_id: "integration-test-request",
          model: "web-reader-model",
          reader_result: {
            content: `# ${body.url}\nContent extracted from ${body.url}.`,
            description: `Description for ${body.url}`,
            title: `Title for ${body.url}`,
            url: body.url,
            external: { stylesheet: {} },
            metadata: { keywords: "integration, test" }
          }
        })
      }
      return Effect.fail(new Error(`Unexpected endpoint: ${endpoint}`))
    }
  }),
  Layer.succeed(WebReaderService, {
    read: (params) => Effect.gen(function* () {
      const httpClient = yield* ZaiHttpClient
      return yield* httpClient.post(
        "/coding/paas/v4/reader",
        { ...params, search_engine: "web_reader" }, // Adjust as needed
        WebReaderResponseSchema
      )
    })
  })
)

it.effect("should complete full web reading flow", () =>
  Effect.gen(function* () {
    const result = yield* webReader.execute({
      url: "https://example.com/test-page"
    })
    
    expect(result.id).toMatch(/^test-/)
    expect(result.title).toBe("Title for https://example.com/test-page")
    expect(result.content).toContain("https://example.com/test-page")
    expect(result.url).toBe("https://example.com/test-page")
    expect(result.description).toBe("Description for https://example.com/test-page")
  }).pipe(
    Effect.provide(CompleteWebReaderMock)
  )
)
```

### 2. Multiple URL Reading Test
```ts
it.effect("should handle multiple concurrent URL readings", () =>
  Effect.gen(function* () {
    const urls = [
      "https://example1.com",
      "https://example2.com", 
      "https://example3.com"
    ]
    
    // Execute multiple reads concurrently
    const results = yield* Effect.all(
      urls.map(url => 
        webReader.execute({ url })
      ),
      { concurrency: 3 }
    )
    
    expect(results).toHaveLength(3)
    results.forEach((result, index) => {
      expect(result.url).toBe(urls[index])
      expect(result.content).toBeDefined()
      expect(result.title).toBeDefined()
    })
  }).pipe(
    Effect.provide(CompleteWebReaderMock)
  )
)
```

## Performance and Stress Tests

### 1. Rate Limiting Simulation
```ts
// src/__tests__/performance/web-reader-performance.test.ts
import { it, expect } from "@effect/vitest"
import { Effect, Schedule, pipe } from "effect"

it.effect("should handle rate-limited requests", () =>
  Effect.gen(function* () {
    const urls = Array.from({ length: 10 }, (_, i) => `https://example${i}.com`)
    
    // Simulate rate-limited execution
    const results = yield* pipe(
      urls,
      Effect.forEach(url => webReader.execute({ url }), { 
        concurrency: 2 // Limit concurrent requests
      }),
      Effect.flatMap(results => 
        Effect.succeed(results.filter(r => r !== null)) // Filter out failed requests
      )
    )
    
    expect(results).toHaveLength(urls.length)
  }).pipe(
    Effect.provide(CompleteWebReaderMock)
  )
)
```

### 2. Large Content Handling
```ts
it.effect("should handle large content responses", () =>
  Effect.gen(function* () {
    // Mock a large content response
    const largeContent = "# Large Content\n" + 
      Array(1000).fill("This is a line of content.\n").join("")
    
    const mockLargeContentService = Layer.succeed(WebReaderService, {
      read: () => Effect.succeed({
        id: "large-content-test",
        created: Date.now(),
        reader_result: {
          content: largeContent,
          title: "Large Content Test",
          description: "Testing large content handling",
          url: "https://example.com/large-content",
          external: { stylesheet: {} },
          metadata: { keywords: "large, content, test" }
        }
      })
    })
    
    const result = yield* webReader.execute({
      url: "https://example.com/large-content"
    })
    
    expect(result.content).toBe(largeContent)
    expect(result.content.length).toBeGreaterThan(10000) // Verify it's actually large
  })
)
```

## Error Recovery Tests

### 1. Retry Logic Testing
```ts
// src/__tests__/reliability/web-reader-retries.test.ts
import { it, expect } from "@effect/vitest"
import { Effect, Layer, Schedule } from "effect"

it.effect("should retry failed requests appropriately", () =>
  Effect.gen(function* () {
    let callCount = 0
    
    const flakyHttpClient = Layer.succeed(ZaiHttpClient, {
      post: () => {
        callCount++
        if (callCount < 3) {
          // Fail the first two attempts
          return Effect.fail(new Error("Temporary failure"))
        }
        // Succeed on the third attempt
        return Effect.succeed({
          id: "retry-success",
          created: Date.now(),
          reader_result: {
            content: "Content after retry",
            title: "Retry Success",
            url: "https://example.com",
            description: "Successfully retrieved after retries",
            external: { stylesheet: {} },
            metadata: { keywords: "retry, success" }
          }
        })
      }
    })
    
    // Apply retry logic similar to our service implementation
    const result = yield* webReader.execute({
      url: "https://example.com"
    }).pipe(
      Effect.retry(Schedule.recurs(5)) // Retry up to 5 times
    )
    
    expect(callCount).toBe(3) // Should have succeeded on the third attempt
    expect(result.title).toBe("Retry Success")
  })
)
```

These tests provide a comprehensive framework for testing the Web Reader MCP tool, covering functionality, error handling, integration, performance, and reliability aspects.