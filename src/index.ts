/**
 * Z.AI Web Reader MCP Server
 *
 * A minimal MCP server that exposes a single tool for reading and parsing
 * content from URLs using the Z.AI API.
 *
 * This is a simplified single-file implementation that combines schema,
 * tool definition, handlers, and server setup in one place.
 */

import { McpServer, Tool, Toolkit } from "@effect/ai";
import {
	FetchHttpClient,
	HttpClient,
	HttpClientRequest,
	HttpClientResponse,
} from "@effect/platform";
import { BunRuntime, BunSink, BunStream } from "@effect/platform-bun";
import { Config, Effect, Layer, Redacted, Schema } from "effect";

// ============================================================================
// Schema
// ============================================================================

const UnknownSchema = Schema.Record({
	key: Schema.String,
	value: Schema.Unknown,
});

const WebReaderResponseSchema = Schema.Struct({
	id: Schema.String,
	created: Schema.Number,
	request_id: Schema.optional(Schema.String),
	model: Schema.String,
	reader_result: Schema.Struct({
		content: Schema.String,
		description: Schema.optional(Schema.String),
		title: Schema.optional(Schema.String),
		url: Schema.optional(Schema.String),
		metadata: Schema.optional(UnknownSchema),
		external: Schema.optional(UnknownSchema),
		images: Schema.optional(UnknownSchema),
	}),
});

// ============================================================================
// Tool Definition
// ============================================================================

const WebReaderTool = Tool.make("webReader", {
	description:
		"Read and parse content from a specified URL. Returns the page content, title, description, and metadata.",
	success: WebReaderResponseSchema,
	failure: Schema.Never,
	parameters: {
		url: Schema.NonEmptyTrimmedString.annotations({
			description: "The URL to retrieve",
		}),
		timeout: Schema.optional(Schema.Number).annotations({
			description: "Request timeout in seconds",
			default: 20,
		}),
		no_cache: Schema.optional(Schema.Boolean).annotations({
			description: "Whether to disable caching (true/false)",
			default: false,
		}),
		return_format: Schema.optional(
			Schema.Literal("markdown", "text"),
		).annotations({
			description: "Return format (e.g., markdown, text)",
			default: "markdown",
		}),
		retain_images: Schema.optional(Schema.Boolean).annotations({
			description: "Whether to retain images (true/false)",
			default: true,
		}),
		no_gfm: Schema.optional(Schema.Boolean).annotations({
			description: "Whether to disable GitHub Flavored Markdown (true/false)",
			default: false,
		}),
		keep_img_data_url: Schema.optional(Schema.Boolean).annotations({
			description: "Whether to keep image data URLs (true/false)",
			default: false,
		}),
		with_images_summary: Schema.optional(Schema.Boolean).annotations({
			description: "Whether to include image summary (true/false)",
			default: false,
		}),
		with_links_summary: Schema.optional(Schema.Boolean).annotations({
			description: "Whether to include links summary (true/false)",
			default: false,
		}),
	},
});

// ============================================================================
// Toolkit & Handlers
// ============================================================================

const ZaiToolkit = Toolkit.make(WebReaderTool);

const ZaiToolkitHandlers = ZaiToolkit.toLayer(
	Effect.gen(function* () {
		// Get configuration
		const apiKey = yield* Config.redacted("Z_AI_API_KEY");
		const baseUrl = yield* Config.string("ZAI_BASE_URL").pipe(
			Config.withDefault("https://api.z.ai/api"),
		);

		// Setup HTTP client
		const httpClient = yield* HttpClient.HttpClient;
		const httpClientOk = httpClient.pipe(
			HttpClient.filterStatusOk,
			HttpClient.mapRequest(HttpClientRequest.prependUrl(baseUrl)),
			HttpClient.mapRequest(
				HttpClientRequest.bearerToken(Redacted.value(apiKey)),
			),
		);

		// Handler function
		const webReader = (params: Tool.Parameters<typeof WebReaderTool>) => {
			return HttpClientRequest.post("/coding/paas/v4/reader").pipe(
				HttpClientRequest.bodyJson(params),
				Effect.flatMap(httpClientOk.execute),
				Effect.flatMap(
					HttpClientResponse.schemaBodyJson(WebReaderResponseSchema),
				),
				Effect.orDie,
			) as Effect.Effect<
				Schema.Schema.Encoded<typeof WebReaderResponseSchema>,
				never,
				never
			>;
		};

		return { webReader };
	}),
).pipe(Layer.provide(FetchHttpClient.layer));

// ============================================================================
// Server Layer
// ============================================================================

const ServerLayer = Layer.mergeAll(McpServer.toolkit(ZaiToolkit)).pipe(
	Layer.provide(ZaiToolkitHandlers),
	Layer.provide(
		McpServer.layerStdio({
			name: "Z.AI Web Reader MCP Server",
			version: "1.0.0",
			stdin: BunStream.stdin,
			stdout: BunSink.stdout,
		}),
	),
);

// ============================================================================
// Launch
// ============================================================================

Layer.launch(ServerLayer).pipe(BunRuntime.runMain);
