/**
 * Z.AI Web Reader MCP Server
 *
 * A minimal MCP server that exposes a single tool for reading and parsing
 * content from URLs using the Z.AI API.
 *
 * This is a simplified single-file implementation that combines schema,
 * tool definition, handlers, and server setup in one place.
 */

import * as McpServer from "@effect/ai/McpServer";
import * as Tool from "@effect/ai/Tool";
import * as Toolkit from "@effect/ai/Toolkit";
import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import * as HttpClient from "@effect/platform/HttpClient";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as HttpClientResponse from "@effect/platform/HttpClientResponse";
import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunSink from "@effect/platform-bun/BunSink";
import * as BunStream from "@effect/platform-bun/BunStream";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";

// ============================================================================
// Schema
// ============================================================================

const UnknownSchema = Schema.optional(
	Schema.Record({
		key: Schema.String,
		value: Schema.Unknown,
	}),
);

const WebReaderResponseSchema = Schema.Struct({
	created: Schema.Number,
	id: Schema.String,
	model: Schema.String,
	reader_result: Schema.Struct({
		content: Schema.String,
		description: Schema.optional(Schema.String),
		external: UnknownSchema,
		images: UnknownSchema,
		metadata: UnknownSchema,
		title: Schema.optional(Schema.String),
		url: Schema.optional(Schema.String),
	}),
	request_id: Schema.optional(Schema.String),
});

// ============================================================================
// Tool Definition
// ============================================================================

const WebReaderTool = Tool.make("webReader", {
	description: "Fetch and Convert URL to LLM Friendly Input.",
	failure: Schema.Never,
	parameters: {
		keep_img_data_url: Schema.optional(Schema.Boolean).annotations({
			default: false,
			description: "Keep image data URL (true/false), default is false",
		}),
		no_cache: Schema.optional(Schema.Boolean).annotations({
			default: false,
			description: "Disable cache(true/false), default is false",
		}),
		no_gfm: Schema.optional(Schema.Boolean).annotations({
			default: false,
			description:
				"Disable GitHub Flavored Markdown (true/false), default is false",
		}),
		retain_images: Schema.optional(Schema.Boolean).annotations({
			default: false,
			description: "Retain images (true/false), default is true",
		}),
		return_format: Schema.optional(
			Schema.Literal("markdown", "text"),
		).annotations({
			default: "markdown",
			description:
				"Reader response content type (markdown or text), default is markdown",
		}),
		timeout: Schema.optional(Schema.Number).annotations({
			default: 20,
			description: "Request timeout(unit is second), default is 20",
		}),
		url: Schema.NonEmptyTrimmedString.annotations({
			description: "The URL of the website to fetch and read",
		}),
		with_images_summary: Schema.optional(Schema.Boolean).annotations({
			default: false,
			description: "Include images summary (true/false), default is false",
		}),
		with_links_summary: Schema.optional(Schema.Boolean).annotations({
			default: false,
			description: "Include links summary (true/false), default is false",
		}),
	},
	success: WebReaderResponseSchema,
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
			stdin: BunStream.stdin,
			stdout: BunSink.stdout,
			version: "1.0.0",
		}),
	),
);

// ============================================================================
// Launch
// ============================================================================

Layer.launch(ServerLayer).pipe(BunRuntime.runMain);
