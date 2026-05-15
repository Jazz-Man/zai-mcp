# Z.AI Web Reader MCP Server

A high-performance, standalone MCP server that provides intelligent web content extraction capabilities using Z.AI API. Built with Effect TypeScript and Bun for maximum performance and type safety.

## Features

- **Web Content Extraction**: Intelligently extracts and parses web page content
- **Multiple Output Formats**: Supports Markdown and plain text output
- **Advanced Options**: Image handling, caching, and content customization
- **Type-Safe**: Built with Effect TypeScript for compile-time guarantees
- **Standalone Binary**: Single executable with no runtime dependencies
- **Blazing Fast**: Powered by Bun for instant startup and execution

## Quick Start

### Prerequisites

- **Bun** >= 1.0.0
- **Z.AI API Key** - Get yours at [z.ai](https://z.ai)

### Installation

This package is published to [GitHub Packages](https://npm.pkg.github.com), not the public npm registry.

Add this line to your project's `.npmrc` (or `~/.npmrc` for global access):

```
@jazz-man:registry=https://npm.pkg.github.com
```

Then install:

```bash
bun install @jazz-man/web-reader-mcp
```

To build from source:

```bash
git clone https://github.com/yourusername/zai-mcp.git
cd zai-mcp
bun install
bun run build:bin

# The binary will be created at: bin/web-reader-mcp
```

### Configuration

Set your Z.AI API key as an environment variable:

```bash
export Z_AI_API_KEY="your_api_key_here"

# Optional: Customize API base URL (default: https://api.z.ai/api)
export ZAI_BASE_URL="https://api.z.ai/api"
```

## Usage

### Running the Server

#### Option 1: Development Mode

```bash
# Run from source
bun run dev

# Or directly with Bun
bun run src/index.ts
```

#### Option 2: Standalone Binary

```bash
# Run the compiled executable
./bin/web-reader-mcp

# Or install globally for system-wide access
sudo cp bin/web-reader-mcp /usr/local/bin/
web-reader-mcp
```

### Using with MCP Clients

#### With MCP Inspector

```bash
npx @modelcontextprotocol/inspector ./bin/web-reader-mcp
```

This launches a web UI for testing the MCP server and its tools.

#### With Goose Desktop

Add to your `~/.config/goose/config.yaml`:

```yaml
extensions:
  zai-web-reader:
    enabled: true
    type: stdio
    name: zai-web-reader
    description: Z.AI Web Reader MCP Server
    cmd: /usr/local/bin/web-reader-mcp
    args: []
    envs: {}
    env_keys:
      - Z_AI_API_KEY
    timeout: 300
```

## Available Tools

### webReader

Fetches and converts web pages into LLM-friendly input formats.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `url` | string | Yes | - | The URL of the website to fetch and read |
| `timeout` | number | No | 20 | Request timeout in seconds |
| `no_cache` | boolean | No | false | Disable caching |
| `return_format` | string | No | markdown | Response format (`markdown` or `text`) |
| `retain_images` | boolean | No | false | Retain images in output |
| `no_gfm` | boolean | No | false | Disable GitHub Flavored Markdown |
| `keep_img_data_url` | boolean | No | false | Keep image data URLs |
| `with_images_summary` | boolean | No | false | Include images summary |
| `with_links_summary` | boolean | No | false | Include links summary |

#### Example Usage

```json
{
  "url": "https://example.com/article",
  "return_format": "markdown",
  "retain_images": true,
  "timeout": 30
}
```

#### Response Format

```typescript
{
  "id": string,
  "created": number,
  "request_id"?: string,
  "model": string,
  "reader_result": {
    "content": string,
    "description"?: string,
    "title"?: string,
    "url"?: string,
    "metadata"?: Record<string, unknown>,
    "external"?: Record<string, unknown>,
    "images"?: Record<string, unknown>
  }
}
```

## Development

### Project Structure

```
zai-mcp/
├── src/
│   └── index.ts           # Single-file implementation
├── bin/
│   └── web-reader-mcp     # Compiled executable
├── package.json
├── tsconfig.json
└── README.md
```

### Scripts

```bash
# Development
bun run dev              # Run from source

# Build
bun run build:bin        # Create standalone executable
bun run typecheck        # Type check without building

# Testing
npx @modelcontextprotocol/inspector bun run dev
```

### Technology Stack

- **Runtime**: Bun.sh
- **Framework**: Effect TypeScript (@effect/ai, @effect/platform-bun)
- **Protocol**: Model Context Protocol (MCP)
- **Language**: TypeScript 5

### Building Executables

The project uses Bun's built-in compiler to create standalone executables:

```bash
bun build --compile \
  --target=bun-darwin-arm64 \
  --minify \
  --bytecode \
  src/index.ts \
  --outfile bin/web-reader-mcp
```

#### Build Targets

| Target | Platform | Architecture |
|--------|----------|--------------|
| `bun-darwin-arm64` | macOS | ARM64 (Apple Silicon) |
| `bun-darwin-x64` | macOS | x64_64 (Intel) |
| `bun-linux-x64` | Linux | x64_64 |
| `bun-windows-x64` | Windows | x64_64 |

## Architecture

This server follows a simplified, single-file architecture that combines:

1. **Schema Definition**: TypeScript schemas for API responses using Effect Schema
2. **Tool Definition**: MCP tool definition with type-safe parameters
3. **HTTP Client**: Configured HTTP client with authentication and error handling
4. **Server Setup**: MCP server with stdio transport for client communication

### Key Design Decisions

- **Single File**: All logic in one file for simplicity and easy maintenance
- **Effect-Based**: Functional error handling and dependency injection
- **Standalone Binary**: No runtime dependencies after compilation
- **Type-Safe**: Full TypeScript coverage with no `any` types
- **Minimal Overhead**: Direct HTTP calls without unnecessary abstraction layers

## Performance

- **Startup Time**: < 100ms (with bytecode compilation)
- **Memory Usage**: ~50MB for compiled binary
- **Binary Size**: ~65MB (includes Bun runtime)

## Error Handling

The server uses Effect's typed error system:

- **Network Errors**: Automatic retry with exponential backoff
- **API Errors**: Clear error messages with status codes
- **Validation Errors**: Type-safe parameter validation

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.

## Support

For issues and questions:
- Open a GitHub issue
- Check the [Effect documentation](https://effect.website/)
- Review MCP specification at [modelcontextprotocol.io](https://modelcontextprotocol.io)
- Visit [z.ai](https://z.ai) for API documentation

---

**Version**: 1.0.0  
**Built with**: Effect TypeScript + Bun  
**Protocol**: Model Context Protocol (MCP)
