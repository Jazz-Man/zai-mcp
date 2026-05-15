# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

zai-mcp is a standalone MCP (Model Context Protocol) server that exposes a `webReader` tool for fetching URLs and converting web content into LLM-friendly formats (Markdown or plain text) via the Z.AI API. It uses Effect TypeScript for functional, type-safe programming and Bun as the runtime.

## Commands

```sh
bun install            # Install dependencies
bun run dev            # Run the MCP server from source
bun run build:bin      # Compile standalone binary (outputs to bin/web-reader-mcp, macOS ARM64 only)
bun run typecheck      # Type-check with tsc --noEmit
bunx biome check .     # Lint and format check (no npm script defined)
```

No tests exist yet. When adding them, use `bun test` and place files in a `tests/` directory (configured in `bunfig.toml`).

## Architecture

Three source files under `src/`, plus a binary entry point:

- **`src/schema.ts`** -- Effect Schema for the Z.AI API response (`WebReaderResponseSchema`). Defines `reader_result` with content, title, url, metadata, images, etc.
- **`src/tool.ts`** -- MCP tool definition using `@effect/ai/Tool`. Declares the `webReader` tool name, description, and typed parameters (url, timeout, return_format, etc.).
- **`src/index.ts`** -- Wires everything together: creates `ZaiToolkit` from the tool, builds a handler Layer that reads `Z_AI_API_KEY` and `ZAI_BASE_URL` from env, sets up a Bearer-auth HTTP client, POSTs params to `/coding/paas/v4/reader`, and decodes the response against the schema.
- **`bin/web-reader-mcp.ts`** -- Executable entry point. Merges toolkit + handlers, provides stdio transport (`McpServer.layerStdio`), and launches via `BunRuntime.runMain`.

Data flow: MCP client (stdio JSON-RPC) → McpServer → ZaiToolkit handler → HTTP POST to Z.AI API → schema validation → response back to client.

## Key Dependencies

- **`effect`** / **`@effect/ai`** / **`@effect/platform`** / **`@effect/platform-bun`** -- Effect ecosystem for Layer-based DI, Schema, HTTP client, MCP server, and Bun runtime integration.
- **`biome`** -- Linting and formatting (tab indentation, double quotes, recommended rules).

## Conventions

- Default to Bun over Node.js (`bun` not `node`, `bun install` not `npm install`, etc.).
- Use Effect patterns: `Effect` for computations, `Layer` for dependency injection, `Schema` for type-safe decoding, `Config` for environment variables.
- The `Z_AI_API_KEY` env var is required at runtime (wrapped in `Config.redacted`).
- Bun automatically loads `.env` files; don't use dotenv.
