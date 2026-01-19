# HTTP Client Documentation Summary from @effect/platform

## Overview
The `@effect/platform/HttpClient*` modules provide a way to send HTTP requests, handle responses, and abstract over the differences between platforms.

The `HttpClient` interface has a set of methods for sending requests:
- `.execute` - takes a HttpClientRequest and returns a HttpClientResponse
- `.{get, del, head, options, patch, post, put}` - convenience methods for creating a request and executing it in one step

To access the `HttpClient`, you can use the `HttpClient.HttpClient` tag. This will give you access to a `HttpClient` instance.

## Key Features

### 1. Basic Usage
```typescript
import { FetchHttpClient, HttpClient } from "@effect/platform"
import { Effect } from "effect"

const program = Effect.gen(function* () {
  // Access HttpClient
  const client = yield* HttpClient.HttpClient

  // Create and execute a GET request
  const response = yield* client.get(
    "https://jsonplaceholder.typicode.com/posts/1"
  )

  const json = yield* response.json

  console.log(json)
}).pipe(
  // Provide the HttpClient
  Effect.provide(FetchHttpClient.layer)
)
```

### 2. Request Creation
Use `HttpClientRequest` to create custom requests:
- `HttpClientRequest.del` - Create a DELETE request
- `HttpClientRequest.get` - Create a GET request
- `HttpClientRequest.head` - Create a HEAD request
- `HttpClientRequest.options` - Create an OPTIONS request
- `HttpClientRequest.patch` - Create a PATCH request
- `HttpClientRequest.post` - Create a POST request
- `HttpClientRequest.put` - Create a PUT request

### 3. Request Customization
- Set headers using `HttpClientRequest.setHeader` or `HttpClientRequest.setHeaders`
- Add basic auth using `HttpClientRequest.basicAuth`
- Add bearer token using `HttpClientRequest.bearerToken`
- Set accept headers using `HttpClientRequest.accept` or `HttpClientRequest.acceptJson`

### 4. Response Handling
The `HttpClientResponse` provides several methods to convert a response:
- `arrayBuffer` - Convert to ArrayBuffer
- `formData` - Convert to FormData
- `json` - Convert to JSON
- `stream` - Convert to a Stream of Uint8Array
- `text` - Convert to text
- `urlParamsBody` - Convert to UrlParams

### 5. Schema Validation
Integrate with Effect Schema for type-safe responses:
```typescript
import { HttpClientResponse } from "@effect/platform"
import { Schema } from "effect"

const Post = Schema.Struct({
  id: Schema.Number,
  title: Schema.String
})

// Validate response against schema
const result = yield* HttpClientResponse.schemaBodyJson(Post)(response)
```

### 6. Error Handling
- By default, non-200 status codes are not treated as errors
- Use `HttpClient.filterStatusOk` to treat non-2xx responses as errors
- Use `HttpClient.filterStatus` to filter responses by specific status codes

### 7. Client Customization
The HttpClient can be customized in various ways:
- `HttpClient.tapRequest` - Perform an effect on the request before sending
- `HttpClient.mapRequest` - Transform the request before sending
- `HttpClient.mapRequestInput` - Transform the request at the start of the chain
- `HttpClient.followRedirects` - Follow HTTP redirects
- `HttpClient.retry` - Retry requests based on a schedule

### 8. Cookie Management
Use `HttpClient.withCookiesRef` to manage cookies across requests:
```typescript
import { Cookies, FetchHttpClient, HttpClient } from "@effect/platform"
import { Effect, Ref } from "effect"

const ref = yield* Ref.make(Cookies.empty)
const client = (yield* HttpClient.HttpClient).pipe(
  HttpClient.withCookiesRef(ref)
)
```

### 9. RequestInit Options
Customize the `FetchHttpClient` by passing `RequestInit` options:
```typescript
import { FetchHttpClient, HttpClient } from "@effect/platform"
import { Effect, Layer } from "effect"

const CustomFetchLive = FetchHttpClient.layer.pipe(
  Layer.provide(
    Layer.succeed(FetchHttpClient.RequestInit, {
      credentials: "include"
    })
  )
)
```

## Bun-specific Notes
- Bun uses the same `FetchHttpClient` implementation as Node.js
- Bun's native fetch is used under the hood, providing better performance
- The same patterns and APIs work identically in Bun and Node.js environments
- Use `FetchHttpClient.layer` to provide the HTTP client in Bun applications