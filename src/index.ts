/**
 * Z.AI Web Reader MCP Server
 *
 * A minimal MCP server that exposes a single tool for reading and parsing
 * content from URLs using the Z.AI API.
 *
 * This is a simplified single-file implementation that combines schema,
 * tool definition, handlers, and server setup in one place.
 */

import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunStdio from "@effect/platform-bun/BunStdio";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as McpProtocol from "effect/unstable/ai/McpProtocol";
import * as McpServer from "effect/unstable/ai/McpServer";
import * as Toolkit from "effect/unstable/ai/Toolkit";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse";
import { WebReaderResponseSchema } from "./schema.ts";
import { WebReaderTool } from "./tool.ts";

export const ZaiToolkit = Toolkit.make(WebReaderTool);

export const ZaiToolkitHandlers = ZaiToolkit.toLayer(
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

		return {
			webReader: (params) =>
				HttpClientRequest.post("/coding/paas/v4/reader").pipe(
					HttpClientRequest.bodyJson(params),
					Effect.flatMap(httpClientOk.execute),
					Effect.flatMap(
						HttpClientResponse.schemaBodyJson(WebReaderResponseSchema),
					),
					Effect.orDie,
				),
		};
	}),
).pipe(Layer.provide(FetchHttpClient.layer));

// ============================================================================
// Server Layer
// ============================================================================

export const ServerLayer = McpServer.toolkit(ZaiToolkit).pipe(
	Layer.provide(ZaiToolkitHandlers),
	Layer.provide(
		McpServer.layerStdio({
			name: "Z.AI Web Reader MCP Server",
			protocols: [McpProtocol.v2025_06_18],
			version: "1.0.0",
		}),
	),
	Layer.provide(BunStdio.layer),
);

Layer.launch(ServerLayer).pipe(BunRuntime.runMain);
