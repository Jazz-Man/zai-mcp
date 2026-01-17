import { Effect, Schema } from "effect";
import type { NetworkError, ApiError } from "../schemas/common.js";
import {
  WebSearchApiResponseSchema,
  WebSearchRequestSchema,
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
export class WebSearchService extends Effect.Service<WebSearchService>()("WebSearchService", {
  dependencies: [ZaiHttpClient.Default],
  effect: Effect.gen(function* () {
    const httpClient = yield* ZaiHttpClient;

    return {
      /**
       * Perform web search with given parameters
       *
       * @param params - Search parameters including query, filters, etc.
       * @returns Effect with search results
       */
      search: (
        params: Omit<WebSearchRequest, "search_engine">,
      ): Effect.Effect<WebSearchApiResponse, NetworkError | ApiError, never> =>
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
        })
    };
  })
}) {}
