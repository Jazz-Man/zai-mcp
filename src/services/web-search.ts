/**
 * Web Search Service
 *
 * Business logic layer for Web Search API
 * Handles search requests with various filters
 */

import { Context, Effect, Layer } from "effect";
import type { ApiError, NetworkError } from "../schemas/common.js";
import {
	WebSearchApiResponseSchema,
	type WebSearchRequestSchema,
} from "../schemas/web-search.js";
import { ZaiHttpClient } from "./http-client.js";

// Type inference from schemas
type WebSearchRequest = typeof WebSearchRequestSchema.Type;
type WebSearchApiResponse = typeof WebSearchApiResponseSchema.Type;

/**
 * WebSearchService - Web Search business logic
 *
 * Responsibilities:
 * - Build API requests from user parameters
 * - Call ZaiHttpClient with proper endpoint
 * - Validate and transform responses
 */
export class WebSearchService extends Context.Tag("WebSearchService")<
	WebSearchService,
	{
		/**
		 * Perform web search with given parameters
		 *
		 * @param params - Search parameters including query, filters, etc.
		 * @returns Effect with search results
		 */
		readonly search: (
			params: Omit<WebSearchRequest, "search_engine">,
		) => Effect.Effect<WebSearchApiResponse, NetworkError | ApiError>;
	}
>() {}

const make = Effect.gen(function* () {
	const httpClient = yield* ZaiHttpClient;

	const search = (
		params: Omit<WebSearchRequest, "search_engine">,
	): Effect.Effect<WebSearchApiResponse, NetworkError | ApiError> =>
		Effect.gen(function* () {
			// Build API request with fixed search_engine
			const request: WebSearchRequest = {
				search_engine: "search-prime",
				...params,
			};

			// Call API
			const response = yield* httpClient.post(
				"/paas/v4/web_search",
				request,
				WebSearchApiResponseSchema,
			);

			return response;
		});

	return { search };
});

/**
 * Layer that provides WebSearchService
 * Depends on ZaiHttpClient
 */
export const WebSearchServiceLayer = Layer.effect(WebSearchService, make);
