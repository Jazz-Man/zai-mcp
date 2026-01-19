/**
 * Z.AI MCP Server - Entry Point
 *
 * Main server file that launches the MCP server with stdio transport
 * Currently exposes webSearchPrime tool
 */

import * as McpServer from "@effect/ai/McpServer";
import * as Tool from "@effect/ai/Tool";
import * as Toolkit from "@effect/ai/Toolkit";
import {
	FetchHttpClient,
	HttpClient,
	HttpClientRequest,
	HttpClientResponse,
} from "@effect/platform";
import { BunRuntime, BunSink, BunStream } from "@effect/platform-bun";
import { Effect, Layer, Logger, Option, pipe, Redacted, Schema } from "effect";

import { ZaiConfigService } from "./config.js";
import type { ApiError, NetworkError } from "./schemas/common.js";
// Import services
import { WebSearchService } from "./services/web-search.js";

/**
 * Create MCP Tool for web search
 * Uses failureMode: "return" - errors are wrapped in result object
 * Handlers CAN have dependencies with this mode
 */
const WebSearchTool = Tool.make("webSearchPrime", {
	dependencies: [WebSearchService],
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
	success: Schema.Struct({
		id: Schema.String.annotations({
			description: "Task ID for the search request",
		}),
		result_count: Schema.Number.annotations({
			description: "Number of search results returned",
		}),
		results: Schema.Array(
			Schema.Struct({
				index: Schema.Number.annotations({ description: "Result index" }),
				title: Schema.String.annotations({ description: "Page title" }),
				url: Schema.String.annotations({ description: "Page URL" }),
				summary: Schema.String.annotations({ description: "Content summary" }),
				website: Schema.String.annotations({ description: "Website name" }),
				icon: Schema.String.annotations({ description: "Website icon URL" }),
				publish_date: Schema.optional(
					Schema.String.annotations({ description: "Publication date" }),
				),
			}),
		).annotations({ description: "Formatted search results" }),
	}),
});

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * Create handler for webSearchPrime tool
 *
 * With failureMode: "return":
 * - Handlers CAN have dependencies (WebSearchService)
 * - Errors are caught and converted to the failure schema
 * - Returns Effect<Success | Failure, never, Requirements>
 */
const WebSearchToolHandler = (params: {
	readonly search_query: string;
	readonly search_domain_filter?: string;
	readonly search_recency_filter?:
		| "oneDay"
		| "oneWeek"
		| "oneMonth"
		| "oneYear"
		| "noLimit";
	readonly content_size?: "medium" | "high";
	readonly location?: "cn" | "us";
}) =>
	Effect.gen(function* () {
		// Get the WebSearchService from context
		const webSearchService = yield* WebSearchService;

		// Call the service - errors will be caught by Toolkit
		const response = yield* webSearchService.search({
			search_query: params.search_query,
			count: Option.none(),
			search_domain_filter: params.search_domain_filter,
			search_recency_filter: params.search_recency_filter,
			content_size: params.content_size,
			location: params.location,
		});

		// Transform API response to tool output format
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
	}).pipe(
		// Convert service errors to tool error schema format
		Effect.catchTags({
			NetworkError: (error) =>
				Effect.succeed({
					_tag: "NetworkError" as const,
					message: error.message,
					endpoint: error.endpoint,
				} as const),
			ApiError: (error) =>
				Effect.succeed({
					_tag: "ApiError" as const,
					message: error.message,
					code: error.code,
					endpoint: error.endpoint,
				} as const),
		}),
	);

// =============================================================================
// Toolkit Creation
// =============================================================================

const ZaiToolkit = Toolkit.make(WebSearchTool);

class WebSearchServiceNew extends Effect.Service<WebSearchServiceNew>()("WebSearchServiceNew",{
dependencies: [FetchHttpClient.layer, ZaiConfigService.Default],
  effect: Effect.gen(function* () {
    const config = yield* ZaiConfigService;
			const apiKey = Redacted.value(config.apiKey);
			const defaultClient = yield* HttpClient.HttpClient;

			const client = pipe(
				defaultClient,

				HttpClient.mapRequest(HttpClientRequest.prependUrl(config.baseUrl)),
				HttpClient.mapRequest((request) =>
					HttpClientRequest.setHeaders({
						Authorization: `Bearer ${apiKey}`,
						"Content-Type": "application/json",
					})(request),
				),
			);




    return {
      search: (params: any) => httpClientOk.post("/paas/v4/web_search").pipe(HttpClientRequest.bearerToken(apiKey)),
    };
  })
})


const ZaiHandlersNew = ZaiToolkit.toLayer(
	Effect.gen(function* () {
		const webSearchService = yield* WebSearchService;

		return {
			webSearchPrime: (params) => webSearchService.search(params),
		};
	}),
).pipe(Layer.provide(WebSearchService.Default));

// =============================================================================
// Server Layer Composition
// =============================================================================

const MainLayer = Layer.mergeAll(McpServer.toolkit(ZaiToolkit)).pipe(
	Layer.provide(ZaiHandlersNew),
	Layer.provide(WebSearchService.Default),
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

Layer.launch(MainLayer).pipe(BunRuntime.runMain);
