# HTTP Client Research for @effect/platform-bun

## Overview
Based on the analysis of @effect/platform documentation and @effect/platform-bun source code, here's the key information about HTTP client usage in Bun environment:

## Key Points

### 1. HTTP Client Architecture
- `@effect/platform` provides platform-independent HTTP client abstractions
- `@effect/platform-bun` implements Bun-specific functionality
- The HTTP client functionality is primarily provided through `FetchHttpClient` from `@effect/platform`

### 2. Bun-specific Implementation
- Bun uses `FetchHttpClient` which is shared between Node and Bun platforms
- The `FetchHttpClient.layer` provides the HTTP client implementation for Bun
- Bun's native `fetch` is used under the hood

### 3. Usage Pattern
```typescript
import { HttpClient, HttpClientRequest } from "@effect/platform";
import { FetchHttpClient } from "@effect/platform";
import { Effect, Layer } from "effect";

// Access the HTTP client
const program = Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient;
  
  // Create and execute a request
  const response = yield* client.get("https://api.example.com/data");
  const data = yield* response.json;
  
  return data;
});

// Provide the Bun HTTP client layer
const BunProgram = program.pipe(
  Effect.provide(FetchHttpClient.layer)
);
```

### 4. Important Differences from @effect/platform-node
- Unlike `@effect/platform-node`, Bun doesn't require specific HTTP client layers like `NodeHttpClient`
- Bun uses the same `FetchHttpClient` implementation as Node, but leverages Bun's native fetch
- Bun's fetch implementation is faster and more efficient than Node's http module

### 5. Request Customization
- Headers can be set using `HttpClientRequest.setHeader` or `HttpClientRequest.setHeaders`
- Authentication can be added using `HttpClientRequest.bearerToken` or `HttpClientRequest.basicAuth`
- Body content can be set using `HttpClientRequest.bodyJson`, `HttpClientRequest.bodyText`, etc.

### 6. Error Handling
- HTTP status codes outside 2xx range are not considered errors by default
- Use `HttpClient.filterStatusOk` to treat non-2xx responses as errors
- Schema validation can be used with `HttpClientResponse.schemaBodyJson` for type-safe responses

### 7. Our Current HTTP Client Implementation
Our current `ZaiHttpClient` in `src/services/http-client.ts` already follows the correct pattern:
- Uses `@effect/platform` imports for HttpClient
- Implements proper error handling
- Uses bearer authentication
- Applies base URL prefixing
- Works with Bun through the shared FetchHttpClient implementation

### 8. For MCP Server Implementation
When implementing the Web Reader MCP tool, we can continue using our existing HTTP client pattern since it's already platform-agnostic and works with Bun through the FetchHttpClient layer.

## Conclusion
The HTTP client implementation in our project is already correctly set up for Bun usage through the @effect/platform abstractions. The FetchHttpClient layer provides the Bun-specific implementation while maintaining compatibility with our existing code.