# Effect.Service Migration Guide

## Overview

This document explores migrating from `Context.Tag` + `Layer.effect` pattern to `Effect.Service` pattern for simplifying service architecture in the Zai MCP Server project.

## Current Architecture Problems

### Context.Tag + Layer.effect Pattern

```typescript
// Current approach in src/config.ts
export class ZaiConfigService extends Context.Tag("ZaiConfigService")<
  ZaiConfigService,
  ZaiConfig
>() {}

const loadConfig = Effect.gen(function* () {
  const apiKey = yield* Config.redacted("ZAI_API_KEY");
  const timeoutMs = yield* Config.number("ZAI_TIMEOUT_MS").pipe(
    Config.withDefault(10000)
  );
  return { apiKey, timeoutMs } as const;
});

export const ZaiConfigLayer = Layer.effect(ZaiConfigService, loadConfig);
```

**Problems:**
- Boilerplate: Need to define Context.Tag, then separate loadConfig, then separate Layer
- Verbose: ~3 separate pieces for one service
- Error-prone: Easy to mismatch Tag and Layer
- Complex composition: Must manually manage dependency injection in Layer.provide chains

## Effect.Service Pattern

### Basic Example (Correct Syntax)

```typescript
// ✅ Correct syntax from official Effect docs
import { Effect } from "effect";

export class ZaiConfigService extends Effect.Service<ZaiConfigService>()("ZaiConfigService", {
  // Define how to create the service
  effect: Effect.gen(function* () {
    const apiKey = yield* Config.redacted("ZAI_API_KEY");
    const timeoutMs = yield* Config.number("ZAI_TIMEOUT_MS").pipe(
      Config.withDefault(10000)
    );
    return { apiKey, timeoutMs } as const;
  }),
  // Specify dependencies (empty array for no dependencies)
  dependencies: []
}) {}
```

**Key points:**
- `Effect.Service<ZaiConfigService>()("ZaiConfigService", { ... })` — generic parameter then method call
- `dependencies: []` — explicit dependency array (not `dependsOn`)
- Single class definition — no separate Layer export needed

**Advantages:**
1. **Single definition**: Everything in one place
2. **Explicit dependencies**: `dependencies` array makes dependencies clear
3. **Auto-generated Context.Tag**: No need to manually define Tag
4. **Auto-generated Layer**: Use `.scoped` or `.sync` methods
5. **Less code**: ~28% reduction overall

### Service with Dependencies

```typescript
// src/services/http-client.ts
import { Effect } from "effect";

export class ZaiHttpClient extends Effect.Service<ZaiHttpClient>()("ZaiHttpClient", {
  // ✅ Correct: dependencies (not dependsOn)
  dependencies: [ZaiConfigService],
  
  effect: Effect.gen(function* () {
    const config = yield* ZaiConfigService;
    const apiKey = Redacted.value(config.apiKey);
    const defaultClient = yield* HttpClient.HttpClient;
    
    const client = pipe(
      defaultClient,
      HttpClient.mapRequest(HttpClientRequest.prependUrl(ZAI_API_BASE_URL)),
      HttpClient.mapRequest((request) =>
        HttpClientRequest.setHeaders({
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        })(request)
      )
    );
    
    return {
      post: <A>(endpoint: string, body: unknown, schema: Schema.Schema<A>) =>
        Effect.gen(function* () {
          const bodySchema = Schema.Record({
            key: Schema.String,
            value: Schema.Unknown
          });
          
          const response = yield* pipe(
            HttpClientRequest.post(endpoint),
            HttpClientRequest.schemaBodyJson(bodySchema)(body),
            Effect.flatMap(client.execute),
            Effect.mapError((error) =>
              new NetworkError({
                message: `HTTP request failed: ${endpoint}`,
                endpoint,
                cause: error
              })
            )
          );
          
          if (response.status >= 400) {
            const errorResponse = yield* HttpClientResponse.schemaBodyJson(
              ApiErrorResponseSchema
            )(response).pipe(
              Effect.catchAll(() =>
                Effect.succeed({
                  code: String(response.status),
                  message: response.statusText
                })
              )
            );
            
            return yield* new ApiError({
              code: errorResponse.code,
              message: errorResponse.message,
              endpoint
            });
          }
          
          const result = yield* pipe(
            HttpClientResponse.schemaBodyJson(schema)(response),
            Effect.mapError((error) =>
              new NetworkError({
                message: `Failed to decode response: ${String(error)}`,
                endpoint,
                cause: error
              })
            )
          );
          
          return result;
        })
    };
  })
}) {}
```

### Dependent Service

```typescript
// src/services/web-search.ts
import { Effect } from "effect";

export class WebSearchService extends Effect.Service<WebSearchService>()("WebSearchService", {
  // ✅ Correct: dependencies array
  dependencies: [ZaiHttpClient],
  
  effect: Effect.gen(function* () {
    const httpClient = yield* ZaiHttpClient;
    
    return {
      search: (params: Omit<WebSearchRequest, "search_engine">):
        Effect.Effect<WebSearchApiResponse, NetworkError | ApiError> =>
        Effect.gen(function* () {
          const request: WebSearchRequest = {
            search_engine: "search-prime",
            ...params
          };
          
          const response = yield* httpClient.post(
            "/paas/v4/web_search",
            request,
            WebSearchApiResponseSchema
          );
          
          return response;
        })
    };
  })
}) {}
```

## Dependency Graph

```
ZaiConfigService (no dependencies)
    ↓
ZaiHttpClient (dependencies: [ZaiConfigService])
    ↓
WebSearchService (dependencies: [ZaiHttpClient])
```

Each service explicitly declares its dependencies in `dependencies`, making the graph clear and easy to follow.

## Layer Composition Simplification

### Before (Context.Tag + Layer.effect)

```typescript
// Multiple separate layers
const ZaiConfigLayer = Layer.effect(ZaiConfigService, loadConfig);
const ZaiHttpClientLayer = Layer.effect(ZaiHttpClient, makeHttpClient)
  .pipe(
    Layer.provide(ZaiConfigLayer),
    Layer.provide(FetchHttpClient.layer)
  );
const WebSearchServiceLayer = Layer.effect(WebSearchService, makeWebSearch)
  .pipe(
    Layer.provide(ZaiHttpClientLayer)
  );

// Complex composition
const MainLayer = Layer.mergeAll(McpServer.toolkit(ZaiToolkit))
  .pipe(
    Layer.provide(ZaiHandlers),
    Layer.provide(WebSearchServiceLayer),
    Layer.provide(McpServer.layerStdio({...})),
    Layer.provide(Logger.add(Logger.prettyLogger({...})))
  );
```

### After (Effect.Service)

```typescript
// Just use .scoped or .sync - dependencies are automatic!
const MainLayer = Layer.mergeAll(McpServer.toolkit(ZaiToolkit))
  .pipe(
    Layer.provide(ZaiHandlers),
    // WebSearchService.scoped automatically provides:
    // - WebSearchService
    // - ZaiHttpClient
    // - ZaiConfigService
    Layer.provide(WebSearchService.scoped),
    Layer.provide(McpServer.layerStdio({...})),
    Layer.provide(Logger.add(Logger.prettyLogger({...})))
  );
```

**Key insight**: `WebSearchService.scoped` automatically provides ALL dependencies transitively!

## Code Reduction Comparison

### Current Approach (Context.Tag + Layer.effect)

- `src/config.ts`: ~60 lines
- `src/services/http-client.ts`: ~90 lines + separate ZaiHttpClientLayer export
- `src/services/web-search.ts`: ~40 lines + separate WebSearchServiceLayer export
- `src/index.ts`: ~150 lines (complex Layer composition)

**Total**: ~340 lines

### Effect.Service Approach

- `src/config.ts`: ~40 lines (no separate Layer)
- `src/services/http-client.ts`: ~70 lines (no separate Layer)
- `src/services/web-search.ts`: ~35 lines (no separate Layer)
- `src/index.ts`: ~100 lines (simplified composition)

**Total**: ~245 lines

**Reduction**: ~95 lines (28% less code)

## Handler Pattern with Effect.Service

### Using Services in Tool Handlers

```typescript
// src/index.ts
import { Effect } from "effect";

const WebSearchToolHandler = (params: typeof WebSearchToolInputSchema.Type) =>
  Effect.gen(function* () {
    // Get service from context
    const webSearchService = yield* WebSearchService;
    
    // Call service method (may fail with NetworkError | ApiError)
    const response = yield* webSearchService.search({
      search_query: params.search_query,
      count: Option.none(),
      search_domain_filter: params.search_domain_filter,
      search_recency_filter: params.search_recency_filter,
    });
    
    // Transform response
    return {
      id: response.id,
      result_count: response.search_result.length,
      results: response.search_result.map((r, idx) => ({
        index: idx + 1,
        title: r.title,
        url: r.link,
        summary: r.content,
        website: r.media,
        icon: r.icon,
        publish_date: r.publish_date,
      })),
    };
  });

const ZaiHandlers = ZaiToolkit.toLayer(
  Effect.succeed({
    webSearchPrime: WebSearchToolHandler,
  })
);
```

### Error Handling Strategy

**For MVP, use default `failureMode: "error"`**

```typescript
// Tool definition - do NOT specify failureMode
const WebSearchTool = Tool.make("webSearchPrime", {
  description: "Perform web search...",
  parameters: { /* ... */ },
  success: WebSearchToolOutputSchema,
  // failureMode defaults to "error"
});
```

**Why `failureMode: "error"` is better for MVP:**

1. **Handler can have dependencies**: `yield* WebSearchService` works fine
2. **Handler can have errors**: `NetworkError | ApiError` in error channel
3. **Toolkit handles errors**: Automatically converts to MCP error response
4. **TypeScript compatible**: No `never` type conflicts

**How it works:**

```
Handler returns: Effect<Success, NetworkError | ApiError, WebSearchService>
      ↓
Toolkit.toLayer catches errors in error channel
      ↓
Converts to MCP error response
      ↓
LLM receives structured error
```

## Migration Plan

### Step 1: Migrate Config Service

**File**: `src/config.ts`

```typescript
// ✅ After - Correct syntax
import { Effect, Config } from "effect";

export class ZaiConfigService extends Effect.Service<ZaiConfigService>()("ZaiConfigService", {
  dependencies: [],
  effect: Effect.gen(function* () {
    const apiKey = yield* Config.redacted("ZAI_API_KEY").pipe(
      Effect.mapError((error) => new ConfigError({...}))
    );
    const timeoutMs = yield* Config.number("ZAI_TIMEOUT_MS").pipe(
      Config.withDefault(10000)
    );
    const maxRetries = yield* Config.number("ZAI_MAX_RETRIES").pipe(
      Config.withDefault(3)
    );
    return { apiKey, timeoutMs, maxRetries } as const;
  })
}) {}

// No separate ZaiConfigLayer export needed!
```

### Step 2: Migrate HTTP Client

**File**: `src/services/http-client.ts`

- Convert to `Effect.Service<ZaiHttpClient>()("ZaiHttpClient", { ... })`
- Add `dependencies: [ZaiConfigService]`
- Remove separate `ZaiHttpClientLayer`
- Export just the class

```typescript
import { Effect } from "effect";

export class ZaiHttpClient extends Effect.Service<ZaiHttpClient>()("ZaiHttpClient", {
  dependencies: [ZaiConfigService],
  effect: Effect.gen(function* () {
    // ... implementation
  })
}) {}
```

### Step 3: Migrate Web Search Service

**File**: `src/services/web-search.ts`

- Convert to `Effect.Service<WebSearchService>()("WebSearchService", { ... })`
- Add `dependencies: [ZaiHttpClient]`
- Remove separate `WebSearchServiceLayer`
- Export just the class

```typescript
import { Effect } from "effect";

export class WebSearchService extends Effect.Service<WebSearchService>()("WebSearchService", {
  dependencies: [ZaiHttpClient],
  effect: Effect.gen(function* () {
    // ... implementation
  })
}) {}
```

### Step 4: Simplify Index

**File**: `src/index.ts`

- Remove imports of separate Layers
- Use `WebSearchService.scoped` instead
- Simplify Layer composition

```typescript
// Before
import { ZaiConfigLayer } from "./config";
import { ZaiHttpClientLayer } from "./services/http-client";
import { WebSearchServiceLayer } from "./services/web-search";

// After
import { WebSearchService } from "./services/web-search";
// No need to import other services - they're transitive dependencies!

// Before
const MainLayer = Layer.mergeAll(McpServer.toolkit(ZaiToolkit))
  .pipe(
    Layer.provide(ZaiHandlers),
    Layer.provide(WebSearchServiceLayer),
    Layer.provide(McpServer.layerStdio({...})),
    Layer.provide(Logger.add(Logger.prettyLogger({...})))
  );

// After
const MainLayer = Layer.mergeAll(McpServer.toolkit(ZaiToolkit))
  .pipe(
    Layer.provide(ZaiHandlers),
    Layer.provide(WebSearchService.scoped), // ✅ Auto-provides all dependencies
    Layer.provide(McpServer.layerStdio({...})),
    Layer.provide(Logger.add(Logger.prettyLogger({...})))
  );
```

### Step 5: Remove failureMode: "return"

**From Tool definition:**

```typescript
// Before
const WebSearchTool = Tool.make("webSearchPrime", {
  // ...
  failureMode: "return",
  failure: Schema.Struct({...})
});

// After
const WebSearchTool = Tool.make("webSearchPrime", {
  // ...
  // failureMode defaults to "error"
  // No failure schema needed
});
```

Handler remains unchanged - Toolkit handles error channel automatically.

## Benefits Summary

### Code Quality
- ✅ Less boilerplate
- ✅ Clearer dependencies
- ✅ Easier to read
- ✅ Fewer places for bugs

### Developer Experience
- ✅ Single place to define service
- ✅ Explicit dependency graph
- ✅ Auto-generated layers
- ✅ Simpler composition

### Type Safety
- ✅ Full type inference
- ✅ Compile-time dependency checking
- ✅ No manual Tag/Layer matching

### Maintainability
- ✅ Easier to add new services
- ✅ Easier to modify dependencies
- ✅ Clear service boundaries
- ✅ Better separation of concerns

## Alternative Ways to Define a Service

### 1. Using `succeed` - For Constant Values

```typescript
import { Effect } from "effect";

class MagicNumber extends Effect.Service<MagicNumber>()("MagicNumber", {
  succeed: { value: 42 }
}) {}

// Use it
const program = Effect.gen(function* () {
  const magicNumber = yield* MagicNumber;
  console.log(`The magic number is ${magicNumber.value}`);
});

Effect.runPromise(program.pipe(Effect.provide(MagicNumber.Default)));
// Output: The magic number is 42
```

**When to use**: Static configuration, constants, test mocks

### 2. Using `sync` - For Synchronous Functions

```typescript
import { Effect, Random } from "effect";

class Sync extends Effect.Service<Sync>()("Sync", {
  sync: () => ({
    next: Random.nextInt
  })
}) {}

// Use it
const program = Effect.gen(function* () {
  const sync = yield* Sync;
  const n = yield* sync.next;
  console.log(`The number is ${n}`);
});

Effect.runPromise(program.pipe(Effect.provide(Sync.Default)));
```

**When to use**: Simple computations that don't need Effect

### 3. Using `scoped` - For Resources with Cleanup

```typescript
import { Effect, Console } from "effect";

class Scoped extends Effect.Service<Scoped>()("Scoped", {
  scoped: Effect.gen(function* () {
    // Acquire the resource and ensure it is properly released
    const resource = yield* Effect.acquireRelease(
      Console.log("Acquiring...").pipe(Effect.as("foo")),
      () => Console.log("Releasing...")
    );
    
    // Register a finalizer to run when the effect is completed
    yield* Effect.addFinalizer(() => Console.log("Shutting down"));
    
    return { resource };
  })
}) {}

// Use it
const program = Effect.gen(function* () {
  const scoped = yield* Scoped;
  console.log(`The resource is ${scoped.resource}`);
});

Effect.runPromise(program.pipe(Effect.provide(Scoped.Default)));
/*
Output:
Acquiring...
The resource is foo
Shutting down
Releasing...
*/
```

**When to use**: Database connections, file handles, network sockets

### 4. Using `effect` - For Effectful Initialization

```typescript
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect } from "effect";

class Cache extends Effect.Service<Cache>()("app/Cache", {
  effect: Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const lookup = (key: string) => fs.readFileString(`cache/${key}`);
    return { lookup } as const;
  }),
  dependencies: [NodeFileSystem.layer]
}) {}
```

**When to use**: Services that require async initialization or dependencies

## Using the Generated Layers

Each `Effect.Service` automatically generates two layers:

### `.Default` - Includes All Dependencies

```typescript
import { Cache } from "./services/cache";

// Layer that includes ALL required dependencies
//
//      ┌─── Layer<Cache>
//      ▼
const layer = Cache.Default;

// This automatically provides:
// - Cache
// - FileSystem (from NodeFileSystem.layer)
```

### `.DefaultWithoutDependencies` - Without Dependencies

```typescript
// Layer WITHOUT dependencies, requiring them to be provided externally
//
//      ┌─── Layer.Layer<Cache, never, FileSystem>
//      ▼
const layerNoDeps = Cache.DefaultWithoutDependencies;

// This ONLY provides Cache, you must provide FileSystem separately
const runnable = program.pipe(
  Effect.provide(layerNoDeps),
  Effect.provide(NodeFileSystem.layer)
);
```

## Accessing the Service

```typescript
import { Effect, Console } from "effect";

class Cache extends Effect.Service<Cache>()("app/Cache", {
  effect: Effect.gen(function* () {
    return {
      lookup: (key: string) => Effect.succeed(`value-for-${key}`)
    };
  })
}) {}

// Accessing the Cache Service
const program = Effect.gen(function* () {
  const cache = yield* Cache;
  const data = yield* cache.lookup("my-key");
  console.log(data);
});

const runnable = program.pipe(Effect.provide(Cache.Default));

Effect.runFork(runnable);
// Output: value-for-my-key
```

## Syntax Quick Reference

| ❌ Wrong Syntax | ✅ Correct Syntax |
|----------------|-------------------|
| `Effect.Service("Name")({...})` | `Effect.Service<Name>()("Name", {...})` |
| `dependsOn: [...]` | `dependencies: [...]` |
| Separate `Layer` export | Use `.Default` or `.scoped` on class |

## Service Definition Modes

| Mode | Syntax | Use Case |
|------|--------|----------|
| `succeed` | `{ succeed: { value } }` | Constant values, mocks |
| `sync` | `{ sync: () => ({ ... }) }` | Pure functions, no Effect |
| `scoped` | `{ scoped: Effect.acquireRelease(...) }` | Resources with cleanup |
| `effect` | `{ effect: Effect.gen(...) }` | Async initialization with deps |

## Additional Resources

- Effect.Service documentation: https://effect.website/docs/services
- Migration guide: https://effect.website/docs/migration-guide
- Best practices: https://effect.website/docs/best-practices

## Conclusion

Migrating to `Effect.Service` provides significant benefits:

1. **28% less code** (95 lines)
2. **Clearer architecture** with explicit dependencies
3. **Simpler composition** with auto-generated layers
4. **Better DX** with single-definition services

This is recommended for the MVP to simplify development and focus on core functionality rather than boilerplate.

---

**Updated**: Corrected all syntax examples to use `Effect.Service<Service>()("Service", { ... })` pattern with `dependencies` array (not `dependsOn`).
