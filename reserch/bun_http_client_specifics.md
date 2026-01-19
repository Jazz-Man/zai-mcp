# Bun HTTP Client Specific Information

## Bun Runtime and HTTP Client Integration

### BunRuntime
- Use `BunRuntime.runMain` to run Effect programs in Bun environment
- Equivalent to `NodeRuntime.runMain` for Node.js

### Bun-specific Imports
```typescript
import { BunRuntime, BunSink, BunStream } from "@effect/platform-bun";
```

### Stdio Transport for MCP
For MCP servers using stdio transport in Bun:
```typescript
import { McpServer, Tool, Toolkit } from "@effect/ai";
import { BunRuntime, BunSink, BunStream } from "@effect/platform-bun";
import { Effect, Layer, Logger, Schema } from "effect";

const ServerLayer = Layer.mergeAll(
  McpServer.toolkit(TimezoneToolkit)
).pipe(
  Layer.provide(TimezoneHandlers),
  Layer.provide(
    McpServer.layerStdio({
      name: "Timezone Server",
      version: "1.0.0",
      stdin: BunStream.stdin,  // Bun-specific stdin stream
      stdout: BunSink.stdout,  // Bun-specific stdout sink
    })
  ),
  Layer.provide(Logger.add(Logger.prettyLogger({ stderr: true })))
);

Layer.launch(ServerLayer).pipe(BunRuntime.runMain);
```

### BunStream and BunSink
- `BunStream.stdin` - stream for reading from stdin
- `BunSink.stdout` - sink for writing to stdout
- `BunSink.stderr` - sink for writing to stderr

These are Bun-specific implementations that work with the MCP server's stdio transport.

### Bun HTTP Server (if needed)
For HTTP transport (though MCP typically uses stdio):
```typescript
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";

const ServerLayer = Layer.mergeAll(
  // ... other layers
).pipe(
  Layer.provide(BunHttpServer.layer({ port: 3000 }))
);

Layer.launch(ServerLayer).pipe(BunRuntime.runMain);
```

## Bun vs Node.js HTTP Client Differences

1. **Same Underlying Implementation**: Both Bun and Node.js use `FetchHttpClient` from `@effect/platform`
2. **Native Fetch**: Bun uses its native fetch implementation, which is faster than Node.js http module
3. **No Platform-Specific HTTP Client Needed**: Unlike Node.js which might use `NodeHttpClient`, Bun uses the same `FetchHttpClient` layer
4. **Performance**: Bun's fetch is generally faster and more efficient

## MCP Server Transport Considerations

For MCP servers, the stdio transport is typically used rather than HTTP transport:
- MCP protocol is designed to work over stdio
- MCP Inspector and clients expect stdio communication
- HTTP transport is more for web APIs, not MCP tools

The Bun-specific stdio components (`BunStream.stdin`, `BunSink.stdout`) are essential for MCP server implementation in Bun environment.