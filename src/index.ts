/**
 * Z.AI Web Reader MCP Server
 *
 * A minimal MCP server that exposes a single tool for reading and parsing
 * content from URLs using the Z.AI API.
 *
 * This is a simplified single-file implementation that combines schema,
 * tool definition, handlers, and server setup in one place.
 */

import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import * as HttpClient from "@effect/platform/HttpClient";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as HttpClientResponse from "@effect/platform/HttpClientResponse";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import {
	WebReaderResponseSchema,
	type WebReaderResponseType,
} from "./schema.ts";
import type { WebReaderToolParameters } from "./tool.ts";
import { ZaiToolkit } from "./toolkit.ts";

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

		// Handler function
		const webReader = (params: WebReaderToolParameters) => {
			return HttpClientRequest.post("/coding/paas/v4/reader").pipe(
				HttpClientRequest.bodyJson(params),
				Effect.flatMap(httpClientOk.execute),
				Effect.flatMap(
					HttpClientResponse.schemaBodyJson(WebReaderResponseSchema),
				),
				Effect.orDie,
			) as Effect.Effect<WebReaderResponseType, never, never>;
		};

		return { webReader };
	}),
).pipe(Layer.provide(FetchHttpClient.layer));
