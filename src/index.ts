/**
 * Z.AI MCP Server - Entry Point
 *
 * Main server file that launches the MCP server with stdio transport
 * Exposes three tools: webSearchPrime, webReader, zread
 */

import { McpServer, Tool, Toolkit } from "@effect/ai";
import { BunRuntime, BunSink, BunStream } from "@effect/platform-bun";
import { Effect, Layer, Logger, Option, Schema } from "effect";

// Import services and tools
import {
	WebSearchService,
	WebSearchServiceLayer,
} from "./services/web-search.js";
import {
	type WebSearchToolInputSchema,
	WebSearchToolOutputSchema,
} from "./tools/web-search.js";

// =============================================================================
// Tool Definition: webSearchPrime
// =============================================================================

/**
 * Create MCP Tool for web search
 * This defines the tool interface that will be exposed to LLMs
 *
 * Uses failureMode: "return" so that NetworkError and ApiError from the service
 * are automatically captured by the Toolkit and returned in the result.
 *
 * IMPORTANT: With failureMode: "return", we must define both success and failure schemas.
 * The Toolkit will automatically handle errors and wrap them using the failure schema.
 */
const WebSearchTool = Tool.make("webSearchPrime", {
	description:
		"Perform web search using Z.AI premium search engine. Returns structured results with titles, URLs, summaries, and metadata for each webpage.",
	parameters: {
		search_query: Schema.String.annotations({
			description:
				"Content to be searched, recommended not to exceed 70 characters",
		}),
		search_domain_filter: Schema.optional(
			Schema.String.annotations({
				description:
					"Limit search results to specific domain, e.g., www.example.com",
			}),
		),
		search_recency_filter: Schema.optional(
			Schema.Literal(
				"oneDay",
				"oneWeek",
				"oneMonth",
				"oneYear",
				"noLimit",
			).annotations({
				description:
					"Search for web pages within a specified time range. Default is noLimit. Available: oneDay, oneWeek, oneMonth, oneYear, noLimit",
			}),
		),
		content_size: Schema.optional(
			Schema.Literal("medium", "high").annotations({
				description:
					"Control the number of words in the web page summary; default is medium - medium: balanced mode, 400-600 words; high: maximize context, 2500 words",
			}),
		),
		location: Schema.optional(
			Schema.Literal("cn", "us").annotations({
				description:
					"Guess which region the user is from based on user input. Default is cn (Chinese region). Available: cn (Chinese region), us (non-Chinese region)",
			}),
		),
	},
	success: WebSearchToolOutputSchema,
	failure: Schema.Struct({
		_tag: Schema.String,
		message: Schema.String,
	}),
	failureMode: "return",
});

/**
 * Create handler for webSearchPrime tool
 * Handler receives parameters and returns Effect with result
 *
 * IMPORTANT: With failureMode: "return", we don't need to catch errors here!
 * The Toolkit will automatically handle errors and wrap them in the result.
 *
 * The handler simply returns the transformed response on success.
 * If WebSearchService.search fails with NetworkError|ApiError, Toolkit catches it.
 */
const WebSearchToolHandler = (params: typeof WebSearchToolInputSchema.Type) =>
	Effect.gen(function* () {
		// Get the WebSearchService from context
		const webSearchService = yield* WebSearchService;

		// Call the service (may fail with NetworkError or ApiError)
		const response = yield* webSearchService.search({
			search_query: params.search_query,
			count: Option.none(),
			search_domain_filter: params.search_domain_filter,
			search_recency_filter: params.search_recency_filter,
		});

		// Transform response to output format
		return {
			id: response.id,
			result_count: response.search_result.length,
			results: response.search_result.map(
				(r: (typeof response.search_result)[number], idx: number) => ({
					index: idx + 1,
					title: r.title,
					url: r.link,
					summary: r.content,
					website: r.media,
					icon: r.icon,
					publish_date: r.publish_date,
				}),
			),
		};
	});

// =============================================================================
// Toolkit Creation
// =============================================================================

/**
 * Create toolkit containing webSearchPrime tool
 * Toolkit groups multiple tools together for the MCP server
 */
const ZaiToolkit = Toolkit.make(WebSearchTool);

/**
 * Create handlers layer
 * This layer provides the implementation for each tool in the toolkit
 */
const ZaiHandlers = ZaiToolkit.toLayer(
	Effect.succeed({
		webSearchPrime: WebSearchToolHandler,
	}),
);

// =============================================================================
// Server Layer Composition
// =============================================================================

/**
 * Main server layer composition
 * Combines:
 * 1. Service layers (WebSearchService, HTTP client, Config)
 * 2. MCP Server layer with stdio transport
 * 3. Handlers layer
 * 4. Logging
 */
const MainLayer = Layer.mergeAll(McpServer.toolkit(ZaiToolkit)).pipe(
	Layer.provide(ZaiHandlers),
	Layer.provide(WebSearchServiceLayer),
	Layer.provide(
		McpServer.layerStdio({
			name: "Z.AI MCP Server",
			version: "1.0.0",
			stdin: BunStream.stdin,
			stdout: BunSink.stdout,
		}),
	),
	Layer.provide(Logger.add(Logger.prettyLogger({ stderr: true }))),
);

// =============================================================================
// Server Launch
// =============================================================================

/**
 * Launch the MCP server
 * This starts the server and begins listening for stdin/stdout communication
 */
Layer.launch(MainLayer).pipe(BunRuntime.runMain);
