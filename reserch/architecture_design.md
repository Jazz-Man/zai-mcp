# Zai MCP Server - Architecture Design

**Project:** Custom MCP Server with 3 tools (Web Search, Web Reader, Zread)
**Tech Stack:** Bun.sh + @effect/ai + @effect/platform-bun + Effect
**Date:** 2025-01-17
**Status:** Approved - Ready for Implementation

---

## Table of Contents
- [API Specifications](#api-specifications)
- [Proposed Architecture](#proposed-architecture)
- [File Organization](#file-organization)
- [Key Components](#key-components)
- [Error Handling Strategy](#error-handling-strategy)
- [Layer Composition](#layer-composition)
- [Implementation Plan](#implementation-plan)

---

## API Specifications

### 1. Web Search API

**Endpoint:** `POST https://api.z.ai/api/paas/v4/web_search`

**Request Parameters:**
```typescript
{
  search_engine: "search-prime",
  search_query: string,        // required
  count: number,               // 1-50, default 10
  search_domain_filter?: string,
  search_recency_filter?: string, // oneDay|oneWeek|oneMonth|oneYear|noLimit
  request_id?: string,
  user_id?: string,
  content_size?: string,       // medium|high
  location?: string            // cn|us
}
```

**Response:**
```typescript
{
  id: string,
  created: number,              // Unix timestamp
  search_result: Array<{
    title: string,
    content: string,
    link: string,
    media: string,
    icon: string,
    refer: string,
    publish_date: string
  }>
}
```

### 2. Web Reader API

**Endpoint:** `POST https://api.z.ai/api/paas/v4/reader`

**Request Parameters:**
```typescript
{
  url: string,                  // required
  timeout?: number,             // default 20 (seconds)
  no_cache?: boolean,           // default false
  return_format?: string,       // default "markdown"
  retain_images?: boolean,      // default true
  no_gfm?: boolean,             // default false (GitHub Flavored Markdown)
  keep_img_data_url?: boolean,  // default false
  with_images_summary?: boolean,// default false
  with_links_summary?: boolean  // default false
}
```

**Response:**
```typescript
{
  id: string,
  created: number,
  request_id: string,
  model: string,
  reader_result: {
    content: string,           // main content (markdown)
    description: string,       // page description
    title: string,             // page title
    url: string,               // original URL
    external: {
      stylesheet: object       // external CSS references
    },
    metadata: {
      keywords: string,
      viewport: string,
      description: string,
      format-detection: string
    }
  }
}
```

### 3. Zread API
> Specification pending - awaiting from user

**Common Characteristics:**
- ✅ POST requests with Bearer authentication
- ✅ Same base URL: `https://api.z.ai/api`
- ✅ Similar response structure (id, created, request_id)
- ✅ Error format: `{ code: number, message: string }`

---

## Proposed Architecture

### Three-Tier Architecture

```
┌─────────────────────────────────────────────────────┐
│              Layer 3: MCP Tools                     │
│  src/tools/web-search.ts  │  web-reader.ts  │ zread │
│  (Tool definitions + handlers)                      │
└──────────────────────┬──────────────────────────────┘
                       │ depends on
┌──────────────────────┴──────────────────────────────┐
│            Layer 2: Services                        │
│  src/services/web-search.ts │ web-reader.ts │ zread │
│  + src/services/http-client.ts (shared)            │
│  (Business logic, API communication)               │
└──────────────────────┬──────────────────────────────┘
                       │ depends on
┌──────────────────────┴──────────────────────────────┐
│            Layer 1: Config                          │
│  src/config.ts (ZaiConfigService) ✅               │
│  (Environment variables via Effect.Config)          │
└─────────────────────────────────────────────────────┘
```

### Design Principles

1. **Shared HTTP Client Pattern**
   - `ZaiHttpClient` encapsulates common HTTP logic
   - Each service uses it for their specific endpoints
   - Reduces duplication, enables consistent error handling

2. **Effect-based Error Handling**
   - `TaggedError` for type-safe errors
   - `Effect.retry` for transient failures
   - Proper error propagation to MCP client

3. **Modular File Organization**
   - `schemas/` - TypeScript schemas for validation
   - `services/` - Business logic layer
   - `tools/` - MCP tool definitions
   - Clear separation of concerns

4. **Layer Composition**
   - Bottom-up dependency flow
   - Each Layer provides its dependencies
   - Easy to test and swap implementations

---

## File Organization

```
src/
├── config.ts                    ✅ COMPLETED
│   └── ZaiConfigService
│
├── schemas/
│   ├── common.ts                ⏳ TODO
│   │   ├── NetworkError
│   │   └── ApiError
│   ├── web-search.ts            ✅ COMPLETED
│   │   ├── WebSearchParamsSchema      (MCP input)
│   │   ├── WebSearchRequestSchema     (API request)
│   │   ├── WebSearchApiResponseSchema (API response)
│   │   └── WebSearchOutputSchema      (MCP output)
│   ├── web-reader.ts            ⏳ TODO
│   │   ├── WebReaderParamsSchema
│   │   ├── WebReaderRequestSchema
│   │   ├── WebReaderApiResponseSchema
│   │   └── WebReaderOutputSchema
│   └── zread.ts                 ⏳ PENDING (awaiting spec)
│
├── services/
│   ├── http-client.ts           ⏳ TODO
│   │   └── ZaiHttpClient (shared HTTP layer)
│   ├── web-search.ts            ⏳ TODO
│   │   └── WebSearchService
│   ├── web-reader.ts            ⏳ TODO
│   │   └── WebReaderService
│   └── zread.ts                 ⏳ PENDING
│
├── tools/
│   ├── web-search.ts            ⏳ TODO
│   │   └── webSearchPrime tool
│   ├── web-reader.ts            ⏳ TODO
│   │   └── webReader tool
│   └── zread.ts                 ⏳ PENDING
│
└── index.ts                     ⏳ TODO (rewrite needed)
    └── McpServer with stdio transport
```

---

## Key Components

### 1. ZaiHttpClient (Shared Layer)

```typescript
// src/services/http-client.ts
import { Context, Effect, Layer, Schema } from "effect";
import { ZaiConfigService } from "../config.js";

export class NetworkError extends Schema.TaggedError<NetworkError>()(
  "NetworkError",
  { 
    message: Schema.String,
    cause: Schema.Unknown 
  }
) {}

export class ApiError extends Schema.TaggedError<ApiError>()(
  "ApiError",
  { 
    code: Schema.Int, 
    message: Schema.String,
    endpoint: Schema.String 
  }
) {}

export class ZaiHttpClient extends Context.Tag("ZaiHttpClient")<
  ZaiHttpClient,
  {
    readonly post: <A, E>(
      endpoint: string,
      body: unknown,
      schema: Schema.Schema<A, E>
    ) => Effect<A, NetworkError | ApiError>
  }
>() {}

const make = Effect.gen(function* () {
  const config = yield* ZaiConfigService;
  
  const post = <A, E>(
    endpoint: string,
    body: unknown,
    schema: Schema.Schema<A, E>
  ): Effect<A, NetworkError | ApiError> =>
    Effect.gen(function* () {
      // 1. Build URL
      const url = `${config.baseUrl}${endpoint}`;
      
      // 2. Make request with Bearer auth
      const response = yield* Effect.tryPromise({
        try: () => fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${config.apiKey}`
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(config.timeoutMs)
        }),
        catch: (cause) => new NetworkError({
          message: `HTTP request failed: ${url}`,
          cause
        })
      });
      
      // 3. Check for HTTP errors
      if (!response.ok) {
        const errorBody = yield* Effect.tryPromise({
          try: () => response.json() as Promise<{ code: number; message: string }>,
          catch: () => ({ code: response.status, message: response.statusText })
        });
        
        return yield* new ApiError({
          code: errorBody.code,
          message: errorBody.message,
          endpoint
        });
      }
      
      // 4. Parse response with schema
      const data = yield* Effect.tryPromise({
        try: () => response.json() as Promise<unknown>,
        catch: (cause) => new NetworkError({
          message: `Failed to parse JSON response from ${url}`,
          cause
        })
      });
      
      // 5. Validate with schema
      return yield* Schema.decode(schema)(data);
    }).pipe(
      Effect.retry(
        Schedule.exponential("1 second").pipe(
          Schedule.recurs(3),
          Schedule.compose(Schedule.elapsed),
          Schedule.while((elapsed) => elapsed < config.maxRetries * 1000)
        )
      )
    );
  
  return { post };
});

export const ZaiHttpClientLayer = Layer.effect(ZaiHttpClient, make).pipe(
  Layer.provide(ZaiConfigLayer)
);
```

**Responsibilities:**
- HTTP POST requests with Bearer authentication
- Error handling (4xx, 5xx, network errors)
- Retries with exponential backoff
- Timeout handling via AbortSignal
- Response parsing and validation via Schema

### 2. Service Pattern

```typescript
// src/services/web-search.ts
import { Context, Effect, Layer } from "effect";
import { ZaiHttpClient } from "./http-client.js";
import { 
  WebSearchParamsSchema, 
  WebSearchRequestSchema,
  WebSearchApiResponseSchema,
  WebSearchResult
} from "../schemas/web-search.js";

export class WebSearchService extends Context.Tag("WebSearchService")<
  WebSearchService,
  {
    readonly search: (
      params: WebSearchParams
    ) => Effect<WebSearchResult, NetworkError | ApiError>
  }
>() {}

const make = Effect.gen(function* () {
  const http = yield* ZaiHttpClient;
  
  const search = (params: WebSearchParams): Effect<WebSearchResult, NetworkError | ApiError> =>
    Effect.gen(function* () {
      // Transform MCP input to API request format
      const request = {
        search_engine: "search-prime",
        search_query: params.search_query,
        count: params.count ?? 10,
        search_domain_filter: params.search_domain_filter,
        search_recency_filter: params.search_recency_filter,
        request_id: params.request_id,
        user_id: params.user_id,
        content_size: params.content_size,
        location: params.location
      };
      
      // Call API
      return yield* http.post(
        "/paas/v4/web_search",
        request,
        WebSearchApiResponseSchema
      );
    });
  
  return { search };
});

export const WebSearchServiceLayer = Layer.effect(
  WebSearchService,
  make
).pipe(Layer.provide(ZaiHttpClientLayer));
```

### 3. Tool Handler Pattern

```typescript
// src/tools/web-search.ts
import { Tool, Effect } from "effect";
import { WebSearchService } from "../services/web-search.js";
import { 
  WebSearchParamsSchema, 
  WebSearchOutputSchema 
} from "../schemas/web-search.js";

export const webSearchTool = Tool.make(
  "webSearchPrime",
  Tool.schema(
    WebSearchParamsSchema,  // MCP input validation
    WebSearchOutputSchema   // MCP output validation
  ),
  (input) => Effect.gen(function* () {
    // 1. Get service
    const service = yield* WebSearchService;
    
    // 2. Call service
    const result = yield* service.search(input);
    
    // 3. Transform API response to user-friendly output
    return {
      results: result.search_result.map(item => ({
        title: item.title,
        link: item.link,
        content: item.content,
        media: item.media,
        icon: item.icon,
        refer: item.refer,
        publish_date: item.publish_date
      })),
      total: result.search_result.length,
      query: input.search_query
    };
  })
);
```

**Tool Handler Responsibilities:**
1. Receive MCP input from LLM
2. Input is auto-validated via Schema
3. Transform input → service params
4. Call service layer
5. Transform API response → user-friendly output
6. Return validated output

---

## Error Handling Strategy

### Error Type Hierarchy

```typescript
// src/schemas/common.ts
import { Schema } from "effect";

// Configuration errors
export class ConfigError extends Schema.TaggedError<ConfigError>()(
  "ConfigError",
  { message: Schema.String }
) {}

// Network/transport errors
export class NetworkError extends Schema.TaggedError<NetworkError>()(
  "NetworkError",
  { 
    message: Schema.String,
    cause: Schema.Unknown 
  }
) {}

// API errors (4xx, 5xx)
export class ApiError extends Schema.TaggedError<ApiError>()(
  "ApiError",
  { 
    code: Schema.Int, 
    message: Schema.String,
    endpoint: Schema.String 
  }
) {}

// Schema validation errors
export class ValidationError extends Schema.TaggedError<ValidationError>()(
  "ValidationError",
  { 
    message: Schema.String,
    path: Schema.String,
    value: Schema.Unknown 
  }
) {}
```

### Retry Policy

**Retry on:**
- HTTP 429 (Rate Limit)
- HTTP 500, 502, 503 (Server errors)
- Network errors (DNS, connection refused, timeout)

**No retry on:**
- HTTP 400 (Bad Request)
- HTTP 401 (Unauthorized)
- HTTP 403 (Forbidden)
- HTTP 404 (Not Found)

**Backoff Strategy:**
- Exponential: 1s → 2s → 4s → 8s
- Max retries: 3 (configurable via `ZAI_MAX_RETRIES`)
- Max elapsed time: 30s (configurable via `ZAI_TIMEOUT_MS`)

---

## Layer Composition

### Complete Layer Graph

```
                    ┌─────────────────────┐
                    │   McpServer (main)  │
                    │  (stdio transport)  │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │    Toolkit Layer    │
                    │  (all 3 tools)      │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────┴────────┐    ┌────────┴────────┐    ┌────────┴────────┐
│ WebSearchTool  │    │ WebReaderTool   │    │ ZreadTool       │
│     Layer      │    │     Layer       │    │     Layer       │
└───────┬────────┘    └────────┬────────┘    └────────┬────────┘
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │  Service Layers     │
                    │ (WebSearch,         │
                    │  WebReader, Zread)  │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │ ZaiHttpClient Layer │
                    │  (HTTP client)      │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │  ZaiConfig Layer    │
                    │  (env variables)    │
                    └─────────────────────┘
```

### Implementation in src/index.ts

```typescript
// src/index.ts
import { McpServer, Effect, Layer, runMain } from "effect";
import * as Bun from "@effect/platform-bun";
import { ZaiConfigLayer } from "./config.js";
import { ZaiHttpClientLayer } from "./services/http-client.js";
import { WebSearchServiceLayer } from "./services/web-search.js";
import { WebReaderServiceLayer } from "./services/web-reader.js";
import { webSearchTool } from "./tools/web-search.js";
import { webReaderTool } from "./tools/web-reader.js";

// Compose all layers
const MainLayer = Layer.mergeAll(
  // Layer 1: Config (no dependencies)
  ZaiConfigLayer,
  
  // Layer 2: HTTP Client (depends on Config)
  ZaiHttpClientLayer.pipe(Layer.provide(ZaiConfigLayer)),
  
  // Layer 2+: API Services (depend on HTTP Client)
  WebSearchServiceLayer.pipe(Layer.provide(ZaiHttpClientLayer)),
  WebReaderServiceLayer.pipe(Layer.provide(ZaiHttpClientLayer))
);

// Create toolkit with all tools
const toolkit = Toolkit.make(
  webSearchTool,
  webReaderTool
  // zreadTool will be added when spec is available
);

// Create server layer
const ServerLive = McpServer.layer({
  name: "zai-mcp",
  version: "1.0.0"
}, toolkit).pipe(
  Layer.provide(MainLayer),
  Layer.provide(Bun.BunStream.stdio)
);

// Launch server
McpServer.launch.pipe(
  Effect.provide(ServerLive),
  runMain
);
```

---

## Implementation Plan

### Phase 1: Shared Infrastructure ⚡
**Priority: HIGH** (required by all tools)

- [x] `src/config.ts` - Configuration service
- [ ] `src/schemas/common.ts` - Error schemas (NetworkError, ApiError)
- [ ] `src/services/http-client.ts` - ZaiHttpClient (shared HTTP layer)

**Success criteria:**
- TypeScript compiles without errors (`bun tsc --noEmit`)
- All error types defined as TaggedError
- HTTP client handles auth, retries, timeouts

### Phase 2: Web Search Tool ⚡
**Priority: HIGH** (first working tool)

- [x] `src/schemas/web-search.ts` - All schemas defined
- [ ] `src/services/web-search.ts` - WebSearchService implementation
- [ ] `src/tools/web-search.ts` - webSearchPrime tool definition
- [ ] `src/index.ts` - Minimal server with 1 tool + stdio transport
- [ ] **Test with goose** ✅

**Success criteria:**
- Tool appears in MCP Inspector
- goose can call webSearchPrime successfully
- Results are properly formatted

### Phase 3: Web Reader Tool
**Priority: MEDIUM**

- [ ] `src/schemas/web-reader.ts` - Define all schemas
- [ ] `src/services/web-reader.ts` - WebReaderService implementation
- [ ] `src/tools/web-reader.ts` - webReader tool definition
- [ ] Update `src/index.ts` - Add 2nd tool to toolkit
- [ ] **Test with goose** ✅

**Success criteria:**
- Both tools work independently
- Server handles concurrent requests
- Error handling works correctly

### Phase 4: Zread Tool
**Priority: LOW** (awaiting specification)

- [ ] Receive API specification from user
- [ ] `src/schemas/zread.ts` - Define schemas
- [ ] `src/services/zread.ts` - Service implementation
- [ ] `src/tools/zread.ts` - Tool definition
- [ ] Update `src/index.ts` - Add 3rd tool
- [ ] **Test with goose** ✅

**Success criteria:**
- All 3 tools work together
- Complete end-to-end testing

### Phase 5: Testing & Polish
**Priority: ONGOING**

- [ ] Run `bun tsc --noEmit` after every change
- [ ] Test with MCP Inspector manually
- [ ] Test with goose
- [ ] Add unit tests (optional)
- [ ] Performance optimization
- [ ] Documentation updates

---

## Development Workflow

### Quality Control Rules

1. **TypeScript First**
   ```bash
   # Run after EVERY code change
   bun tsc --noEmit
   
   # Only proceed if no errors
   ```

2. **Incremental Development**
   - Build from bottom-up: Config → HTTP → Services → Tools → Server
   - Test each layer before moving to next
   - Don't skip to higher layers without completing dependencies

3. **Effect Ecosystem Compliance**
   - Use Effect.Config for environment variables (not process.env)
   - Use Context.Tag for dependency injection
   - Use Schema.TaggedError for typed errors
   - Use Layer for dependency management

4. **File Creation Order**
   ```
   1. schemas/  → Define data structures first
   2. services/ → Implement business logic
   3. tools/    → Create MCP tool wrappers
   4. index.ts  → Compose everything together
   ```

### Testing Commands

```bash
# Type checking
bun tsc --noEmit

# Run server (for MCP Inspector)
bun run src/index.ts

# In another terminal - start inspector
mcp-inspector node dist/index.js

# Or use ts-node for development
bun --watch src/index.ts
```

---

## Architecture Benefits

### ✅ DRY (Don't Repeat Yourself)
- `ZaiHttpClient` eliminates HTTP code duplication
- Shared error schemas across all services
- Common retry/timeout logic in one place

### ✅ Modularity
- Each service/tool is independently testable
- Easy to add/remove tools without affecting others
- Clear boundaries between layers

### ✅ Type Safety
- Schema validation at all levels (input, request, response, output)
- TaggedError for compile-time error checking
- TypeScript + Effect provides full type inference

### ✅ Testability
- Layers can be swapped with test doubles
- ConfigProvider.fromMap for environment mocking
- Each component has isolated dependencies

### ✅ Extensibility
- Adding 3rd tool (Zread) requires no changes to existing code
- New services just need to follow the same pattern
- Toolkit automatically discovers and exposes tools

### ✅ Effect-way
- Pure functional code with managed side effects
- Composable effects
- Type-safe error handling
- Predictable resource management

---

## Technology Stack Confirmation

| Component | Library | Purpose |
|-----------|---------|---------|
| **Runtime** | `bun` | Fast JavaScript runtime |
| **MCP Server** | `@effect/ai` | Model Context Protocol implementation |
| **Transport** | `@effect/platform-bun` | Stdio transport for MCP |
| **Effect System** | `effect` | Functional effect system |
| **Schema Validation** | `effect` (Schema module) | Runtime type validation |
| **HTTP Client** | `fetch` (Bun native) | HTTP requests |
| **TypeScript** | `tsc` | Type checking |

---

## Open Questions & Decisions

### ❓ Resolved Questions

1. **Monorepo vs Single Server?**
   - ✅ **Decision:** Single MCP server with 3 tools
   - **Reasoning:** Simpler deployment, shared config/HTTP client

2. **How to organize code?**
   - ✅ **Decision:** Modular flat structure (schemas/, services/, tools/)
   - **Reasoning:** Clear separation, easy navigation

3. **How to handle shared HTTP logic?**
   - ✅ **Decision:** Dedicated ZaiHttpClient service
   - **Reasoning:** DRY, consistent error handling

4. **How to manage configuration?**
   - ✅ **Decision:** Effect.Config with Context.Tag
   - **Reasoning:** Type-safe, testable, Effect-way

### ⏳ Pending Decisions

1. **Zread API specification**
   - Awaiting from user
   - Will follow same pattern as other tools

2. **Unit testing framework**
   - Not decided yet
   - Can be added after core functionality works

3. **Production deployment**
   - Not decided yet
   - Likely will build with `bun build` and distribute as Node package

---

## Glossary

- **MCP** - Model Context Protocol, standardized way for LLMs to call tools
- **Context.Tag** - Effect's dependency injection mechanism
- **Layer** - Effect's dependency management system
- **Schema.TaggedError** - Effect's typed error definition
- **Effect.gen** - Generator-based effect composition
- **Tool.make** - @effect/ai function to create MCP tools
- **McpServer** - Context.Tag for managing MCP server lifecycle
- **McpServerClient** - Context.Tag for RPC communication
- **Toolkit** - Collection of tools with their handlers

---

## References

- **@effect/ai source:** `/Users/vasilsokolik/ai/zai-mcp/node_modules/@effect/ai/src/`
- **Effect Config docs:** https://effect.website/docs/configuration/
- **MCP Protocol:** https://modelcontextprotocol.io/
- **Project research:** `reserch/effect_ts_mcp_documentation.md`
- **Web Search spec:** `reserch/Web_Search.md`
- **Web Reader spec:** `reserch/Web_Reader.md`

---

**Document Status:** ✅ Approved and ready for implementation
**Last Updated:** 2025-01-17
**Next Step:** Implement Phase 1 - Shared Infrastructure
