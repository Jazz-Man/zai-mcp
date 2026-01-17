import {
	HttpClient,
	HttpClientRequest,
	HttpClientResponse,
} from "@effect/platform";
import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import { Context, Effect, Layer, pipe, Redacted, Schema } from "effect";
import {
	ZAI_API_BASE_URL,
	ZaiConfigLayer,
	ZaiConfigService,
} from "../config.js";
import { ApiError, NetworkError } from "../schemas/common.js";

/**
 * ZaiHttpClient - Shared HTTP client for all Z.AI API calls
 *
 * Responsibilities:
 * - HTTP POST requests with Bearer authentication
 * - Error handling (4xx, 5xx, network errors)
 * - Response parsing and validation via Schema
 */
export class ZaiHttpClient extends Context.Tag("ZaiHttpClient")<
	ZaiHttpClient,
	{
		/**
		 * Make a POST request to a Z.AI API endpoint
		 *
		 * @param endpoint - API endpoint path (e.g., "/paas/v4/web_search")
		 * @param body - Request body to send as JSON
		 * @param schema - Schema to validate the response body
		 * @returns Effect that parses and validates the response
		 */
		readonly post: <A>(
			endpoint: string,
			body: unknown,
			schema: Schema.Schema<A>,
		) => Effect.Effect<A, NetworkError | ApiError>;
	}
>() {}

const make = Effect.gen(function* () {
	const config = yield* ZaiConfigService;

	// Extract the actual API key value from Redacted
	const apiKey = Redacted.value(config.apiKey);

	// Get the default HttpClient and configure it
	const defaultClient = yield* HttpClient.HttpClient;

	// Create configured client with base URL and auth headers
	const client = pipe(
		defaultClient,
		HttpClient.mapRequest(HttpClientRequest.prependUrl(ZAI_API_BASE_URL)),
		HttpClient.mapRequest((request) =>
			HttpClientRequest.setHeaders({
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			})(request),
		),
	);

	const post = <A>(
		endpoint: string,
		body: unknown,
		responseSchema: Schema.Schema<A>,
	): Effect.Effect<A, NetworkError | ApiError> =>
		Effect.gen(function* () {
			// Schema for request body (accepts any JSON)
			const bodySchema = Schema.Record({
				key: Schema.String,
				value: Schema.Unknown,
			});

			// Make POST request with JSON body
			const response = yield* pipe(
				HttpClientRequest.post(endpoint),
				HttpClientRequest.schemaBodyJson(bodySchema)(
					body as Record<string, unknown>,
				),
				Effect.flatMap(client.execute),
				Effect.mapError((error) =>
					new NetworkError({
						message: `HTTP request failed: ${endpoint}`,
						endpoint,
						cause: error,
					}),
				),
			);

			// Check for HTTP errors (4xx, 5xx)
			if (response.status >= 400) {
				// Try to parse error body as JSON
				const errorSchema = Schema.Struct({
					code: Schema.Int,
					message: Schema.String,
				});

				const errorResult = yield* pipe(
					HttpClientResponse.schemaBodyJson(errorSchema)(response),
					Effect.either,
				);

				const errorCode =
					errorResult._tag === "Right"
						? errorResult.right.code
						: response.status;
				const errorMessage =
					errorResult._tag === "Right"
						? errorResult.right.message
						: `HTTP ${response.status}`;

				return yield* new ApiError({
					code: errorCode,
					message: errorMessage,
					endpoint,
				});
			}

			// Parse and validate response with Schema
			const result = yield* pipe(
				HttpClientResponse.schemaBodyJson(responseSchema)(response),
				Effect.mapError(
					(error) =>
						new NetworkError({
							message: `Failed to decode response: ${String(error)}`,
							endpoint,
							cause: error,
						}),
				),
			);

			return result;
		});

	return { post };
});

/**
 * Layer that provides ZaiHttpClient
 * Depends on ZaiConfigService and FetchHttpClient
 */
export const ZaiHttpClientLayer = Layer.effect(ZaiHttpClient, make).pipe(
	Layer.provide(ZaiConfigLayer),
	Layer.provide(FetchHttpClient.layer),
);
