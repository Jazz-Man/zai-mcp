# HTTP Client Implementation Guide for Z.AI MCP Server

## Overview
This document summarizes the key information about HTTP client usage in our Z.AI MCP Server project, specifically for implementing the Web Reader API integration using Bun and @effect/platform-bun.

## Key Implementation Points

### 1. Platform-Agnostic HTTP Client
Our current HTTP client implementation in `src/services/http-client.ts` is already correctly set up:
- Uses `@effect/platform` imports for HttpClient, HttpClientRequest, HttpClientResponse
- Implements proper error handling with NetworkError and ApiError
- Uses bearer authentication with API key
- Applies base URL prefixing
- Works with Bun through the shared FetchHttpClient implementation

### 2. Bun-Specific Configuration
For Bun environment, we use the same `FetchHttpClient.layer` that works across platforms:
```typescript
import { FetchHttpClient } from "@effect/platform";
import { BunRuntime } from "@effect/platform-bun";

// Provide the HTTP client layer for Bun
const app = program.pipe(
  Effect.provide(FetchHttpClient.layer)
);

// Run with Bun runtime
Effect.runPromise(app);
```

### 3. Web Reader API Integration
For implementing the Web Reader tool, we'll follow the same pattern as our existing Web Search tool:
- Use the existing `ZaiHttpClient` service
- Create appropriate schemas for Web Reader API request/response
- Implement a `WebReaderService` using the same pattern as `WebSearchService`
- Create a `webReader` tool definition for MCP

### 4. Request/Response Schema Validation
Use Effect Schema for type-safe API communication:
```typescript
// Example for Web Reader request
const WebReaderRequestSchema = Schema.Struct({
  url: Schema.String,
  timeout: Schema.optionalWith(Schema.Int, { as: "Option" }),
  no_cache: Schema.optionalWith(Schema.Boolean, { as: "Option" }),
  return_format: Schema.optionalWith(Schema.Literal("markdown", "text"), { as: "Option" }),
  // ... other parameters
});

// Example for Web Reader response
const WebReaderResponseSchema = Schema.Struct({
  id: Schema.String,
  created: Schema.Int,
  reader_result: Schema.Struct({
    content: Schema.String,
    title: Schema.String,
    description: Schema.String,
    // ... other response fields
  })
});
```

### 5. Error Handling Strategy
Continue using our existing error handling approach:
- NetworkError for network-related failures
- ApiError for API-specific errors (4xx, 5xx responses)
- Proper error propagation through the service layer to MCP tools

### 6. MCP Tool Implementation Pattern
Follow the same pattern as our existing webSearchPrime tool:
1. Define input/output schemas
2. Create service layer with HTTP client
3. Implement MCP tool handler
4. Register tool with the MCP server

### 7. Coding Plan Base URL
For the Coding plan, use the appropriate base URL:
- Standard: `https://api.z.ai/api/paas/v4/reader`
- Coding plan: `https://api.z.ai/api/coding/paas/v4/reader`

This should be configurable in our `ZaiConfigService` based on the user's plan type.

## Implementation Checklist for Web Reader MCP Tool

- [ ] Create Web Reader schemas in `src/schemas/web-reader.ts`
- [ ] Create Web Reader service in `src/services/web-reader.ts` using existing patterns
- [ ] Create Web Reader tool definition in `src/tools/web-reader.ts`
- [ ] Update config service to support Coding plan URL variations
- [ ] Test with actual Web Reader API
- [ ] Integrate with MCP server in `src/index.ts`

## Best Practices

1. **Reuse Existing Patterns**: Follow the same architecture as the existing Web Search implementation
2. **Type Safety**: Use Effect Schema for all request/response validation
3. **Error Propagation**: Maintain consistent error handling across all layers
4. **Configuration**: Make API endpoints configurable based on user's plan
5. **Testing**: Ensure all components work with Bun runtime environment