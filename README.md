# Z.AI MCP Server

A high-performance Model Context Protocol (MCP) server built with Effect TypeScript and Bun, providing web search, web reading, and document analysis capabilities.

## Features

- 🔍 **Web Search**: Advanced web search with AI-optimized results
- 📖 **Web Reader**: Extract and read web page content
- 📄 **Zread**: Document analysis and reading capabilities
- 🚀 **Performance**: Built with Bun for maximum performance
- ✨ **Type Safety**: Full TypeScript support with Effect
- 🛠️ **Effect-based**: Functional error handling and dependency injection

## Installation

```bash
# Install dependencies
bun install
```

## Configuration

Set up your environment variables:

```bash
# Required: Your Z.AI API key
export ZAI_API_KEY="your_api_key_here"

# Optional: API base URL (default: https://api.z.ai/api)
export ZAI_API_BASE_URL="https://api.z.ai/api"

# Optional: Request timeout in milliseconds (default: 30000)
export ZAI_TIMEOUT_MS="30000"

# Optional: Maximum retries (default: 3)
export ZAI_MAX_RETRIES="3"
```

## Usage

### Running the MCP Server

```bash
# Run with stdio transport (recommended for MCP clients)
bun run src/index.ts

# The server will listen for MCP protocol messages over stdin/stdout
```

### Testing with MCP Inspector

```bash
# Install the MCP inspector
npm install -g @modelcontextprotocol/inspector

# Run the inspector with your server
npx @modelcontextprotocol/inspector bun run src/index.ts
```

## Available Tools

### 1. webReader

Read and parse content from a specified URL. Returns the page content, title, description, and metadata.

**Parameters:**
- `url` (string, required): The URL to read and parse content from
- `timeout` (number, optional): Request timeout in seconds. Default is 20
- `no_cache` (boolean, optional): Whether to disable caching (true/false). Default is false
- `return_format` (string, optional): Return format (e.g., markdown, text). Default is markdown
- `retain_images` (boolean, optional): Whether to retain images (true/false). Default is true
- `no_gfm` (boolean, optional): Whether to disable GitHub Flavored Markdown (true/false). Default is false
- `keep_img_data_url` (boolean, optional): Whether to keep image data URLs (true/false). Default is false
- `with_images_summary` (boolean, optional): Whether to include image summary (true/false). Default is false
- `with_links_summary` (boolean, optional): Whether to include links summary (true/false). Default is false

**Example:**
```typescript
{
  "url": "https://example.com/article",
  "return_format": "markdown",
  "retain_images": true
}
```

## Development

### Project Structure

```
zai-mcp/
├── src/
│   ├── config.ts           # Configuration management
│   ├── schemas/            # TypeScript schemas
│   │   └── web-search.ts   # Web search schemas
│   ├── services/           # Business logic
│   │   └── web-search.ts   # Web search service
│   ├── tools/              # MCP tool definitions
│   │   └── web-search.ts   # Web search tool
│   └── index.ts            # Server entry point
├── reserch/                # Research and documentation
└── package.json
```

### Key Technologies

- **Runtime**: Bun.sh
- **Framework**: Effect TypeScript (@effect/ai, @effect/platform-bun)
- **Protocol**: Model Context Protocol (MCP)
- **Language**: TypeScript 5

### Adding New Tools

1. Create schema in `src/schemas/`
2. Create service in `src/services/`
3. Create tool definition in `src/tools/`
4. Register tool in `src/index.ts`

## Architecture

This server follows the Effect TypeScript architecture:

- **Config**: Type-safe configuration with `Effect.Config`
- **Services**: Business logic with dependency injection
- **Tools**: MCP protocol handlers
- **Layers**: Composable dependency management

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.

## Support

For issues and questions:
- Open a GitHub issue
- Check the [Effect documentation](https://effect.website/)
- Review MCP specification at [modelcontextprotocol.io](https://modelcontextprotocol.io)
