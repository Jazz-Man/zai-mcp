/**
 * Web Search MCP Tool
 *
 * Exposes webSearchPrime as an MCP tool for LLMs
 */

import { Effect, Option, Schema } from "effect";
import type { WebSearchRequestSchema } from "../schemas/web-search.js";
import { WebSearchService } from "../services/web-search.js";

// Type inference from schema
type WebSearchRequest = typeof WebSearchRequestSchema.Type;

/**
 * Input schema for the webSearchPrime tool
 * This is what LLMs will provide when calling this tool
 */
export const WebSearchToolInputSchema = Schema.Struct({
	/** Content to be searched */
	search_query: Schema.String.annotations({
		description:
			"Content to be searched, recommended not to exceed 70 characters",
	}),

	/** Domain filter - limit results to specific domain */
	search_domain_filter: Schema.optional(
		Schema.String.annotations({
			description:
				"Limit search results to specific domain, e.g., www.example.com",
		}),
	),

	/** Time range filter */
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

	/** Control content size (medium or high) */
	content_size: Schema.optional(
		Schema.Literal("medium", "high").annotations({
			description:
				"Control the number of words in the web page summary; default is medium - medium: balanced mode, 400-600 words; high: maximize context, 2500 words",
		}),
	),

	/** User location for region-specific results */
	location: Schema.optional(
		Schema.Literal("cn", "us").annotations({
			description:
				"Guess which region the user is from based on user input. Default is cn (Chinese region). Available: cn (Chinese region), us (non-Chinese region)",
		}),
	),
});

/**
 * Output schema for the webSearchPrime tool
 * This is what LLMs will receive as the tool result
 */
export const WebSearchToolOutputSchema = Schema.Struct({
	/** Task ID */
	id: Schema.String.annotations({
		description: "Task ID for the search request",
	}),

	/** Number of results returned */
	result_count: Schema.Int.annotations({
		description: "Number of search results returned",
	}),

	/** Formatted search results */
	results: Schema.Array(
		Schema.Struct({
			/** Result index */
			index: Schema.Int.annotations({
				description: "Index of the result",
			}),

			/** Page title */
			title: Schema.String.annotations({
				description: "Title of the web page",
			}),

			/** Page URL */
			url: Schema.String.annotations({
				description: "URL of the web page",
			}),

			/** Content summary */
			summary: Schema.String.annotations({
				description: "Summary of the web page content",
			}),

			/** Website name */
			website: Schema.String.annotations({
				description: "Name of the website",
			}),

			/** Website icon URL */
			icon: Schema.String.annotations({
				description: "URL of the website icon",
			}),

			/** Publication date */
			publish_date: Schema.optional(
				Schema.String.annotations({
					description: "Publication date of the web page",
				}),
			),
		}),
	).annotations({
		description: "Formatted search results",
	}),
});

/**
 * Tool definition for webSearchPrime
 * This will be registered with the MCP server
 */
export const webSearchPrime = {
	name: "webSearchPrime",
	description:
		"Perform web search using Z.AI premium search engine. Returns structured results with titles, URLs, summaries, and metadata for each webpage.",
	inputSchema: WebSearchToolInputSchema,
	outputSchema: WebSearchToolOutputSchema,

	/**
	 * Execute the web search tool
	 */
	execute: (input: typeof WebSearchToolInputSchema.Type) =>
		Effect.gen(function* () {
			const webSearchService = yield* WebSearchService;

			// Map MCP tool input to API request parameters
			const apiParams: Omit<WebSearchRequest, "search_engine"> = {
				search_query: input.search_query,
				count: Option.none(), // Use API default (10 results)
				search_domain_filter: input.search_domain_filter,
				search_recency_filter: input.search_recency_filter,
				// Note: content_size and location are MCP-specific, not API parameters
				// We'll need to handle them in a more sophisticated way if needed
			};

			// Call the WebSearchService
			const response = yield* webSearchService.search(apiParams);

			// Transform API response to MCP tool output format
			const result = {
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

			return result;
		}),
};

/**
 * Type exports for TypeScript convenience
 */
export type WebSearchToolInput = typeof WebSearchToolInputSchema.Type;
export type WebSearchToolOutput = typeof WebSearchToolOutputSchema.Type;
