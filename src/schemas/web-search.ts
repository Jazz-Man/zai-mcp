/**
 * Schemas for Z.AI Web Search API
 * 
 * This module defines all TypeScript schemas for Web Search
 * based on the official OpenAPI specification
 */

import { Schema } from "effect";

// =============================================================================
// Request Schemas
// =============================================================================

/**
 * Web Search Request parameters
 */
export const WebSearchRequestSchema = Schema.Struct({
  /** The search engine code - always "search-prime" for premium */
  search_engine: Schema.Literal("search-prime"),
  
  /** The content to be searched */
  search_query: Schema.String.annotations({
    description: "Content to be searched, it is recommended that the search query not exceed 70 characters"
  }),
  
  /** The number of results to return (1-50, default 10) */
  count: Schema.optionalWith(Schema.Int.annotations({
    description: "The number of results to return (1-50, default 10)",
    title: "Result Count"
  }), { as: "Option" }),
  
  /** Used to limit search results to specific domains */
  search_domain_filter: Schema.optional(Schema.String.annotations({
    description: "Used to limit the scope of search results, only return content from specified whitelist domains, such as: www.example.com",
    title: "Domain Filter"
  })),
  
  /** Search for webpages within a specified time range */
  search_recency_filter: Schema.optional(Schema.Literal(
    "oneDay",
    "oneWeek", 
    "oneMonth",
    "oneYear",
    "noLimit"
  ).annotations({
    description: "Search for web pages within a specified time range. Default is noLimit",
    title: "Time Range Filter"
  })),
  
  /** Control content size (medium or high) */
  content_size: Schema.optional(Schema.Literal("medium", "high").annotations({
    description: "Control the number of words in the web page summary; default value is medium - medium: balanced mode, 400-600 words; high: maximize context, 2500 words"
  })),
  
  /** User location for region-specific results */
  location: Schema.optional(Schema.Literal("cn", "us").annotations({
    description: "Guess which region the user is from based on user input. Default is cn (Chinese region). Available: cn (Chinese region), us (non-Chinese region)"
  })),
  
  /** User-provided unique identifier for distinguishing requests */
  request_id: Schema.optional(Schema.String.annotations({
    description: "User-provided unique identifier for distinguishing requests"
  })),
  
  /** Unique ID of the end user */
  user_id: Schema.optional(Schema.String.annotations({
    description: "Unique ID of the end user (6-128 characters)"
  }))
});

/**
 * Web Search input parameters for MCP Tool
 * This is the user-facing schema with simplified parameters
 */
export const WebSearchParamsSchema = Schema.Struct({
  /** Content to be searched */
  search_query: Schema.String.annotations({
    description: "Content to be searched, it is recommended that the search query not exceed 70 characters"
  }),
  
  /** Domain filter - limit results to specific domain */
  search_domain_filter: Schema.optional(Schema.String.annotations({
    description: "Used to limit the scope of search results, only return content from specified whitelist domains, such as: www.example.com"
  })),
  
  /** Time range filter */
  search_recency_filter: Schema.optional(Schema.Literal(
    "oneDay",
    "oneWeek",
    "oneMonth", 
    "oneYear",
    "noLimit"
  ).annotations({
    description: "Search for web pages within a specified time range. Default is noLimit. Available values: oneDay, oneWeek, oneMonth, oneYear, noLimit"
  })),
  
  /** Control content size (medium or high) */
  content_size: Schema.optional(Schema.Literal("medium", "high").annotations({
    description: "Control the number of words in the web page summary; default value is medium - medium: balanced mode, 400-600 words; high: maximize context, 2500 words"
  })),
  
  /** User location for region-specific results */
  location: Schema.optional(Schema.Literal("cn", "us").annotations({
    description: "Guess which region the user is from based on user input. Default is cn (Chinese region). Available: cn (Chinese region), us (non-Chinese region)"
  }))
});

// =============================================================================
// Response Schemas
// =============================================================================

/**
 * Individual web search result
 */
export const WebSearchResultSchema = Schema.Struct({
  /** Page title */
  title: Schema.String.annotations({
    description: "Title of the web page"
  }),
  
  /** Content summary */
  content: Schema.String.annotations({
    description: "Summary of the web page content"
  }),
  
  /** Result URL */
  link: Schema.String.annotations({
    description: "URL of the web page"
  }),
  
  /** Website name */
  media: Schema.String.annotations({
    description: "Name of the website"
  }),
  
  /** Website icon URL */
  icon: Schema.String.annotations({
    description: "URL of the website icon"
  }),
  
  /** Index number */
  refer: Schema.String.annotations({
    description: "Index number of the result"
  }),
  
  /** Publication date */
  publish_date: Schema.optional(Schema.String.annotations({
    description: "Publication date of the web page"
  }))
});

/**
 * Complete web search API response
 */
export const WebSearchApiResponseSchema = Schema.Struct({
  /** Task ID */
  id: Schema.String.annotations({
    description: "Task ID for the search request"
  }),
  
  /** Request creation time (Unix timestamp in seconds) */
  created: Schema.Int.annotations({
    description: "Request creation time, Unix timestamp in seconds"
  }),
  
  /** Array of search results */
  search_result: Schema.Array(WebSearchResultSchema).annotations({
    description: "Array of search results"
  })
});

/**
 * Formatted web search result for MCP Tool output
 */
export const WebSearchOutputSchema = Schema.Struct({
  /** Task ID */
  id: Schema.String,
  
  /** Number of results returned */
  result_count: Schema.Int.annotations({
    description: "Number of search results returned"
  }),
  
  /** Search results with formatted display */
  results: Schema.Array(Schema.Struct({
    /** Result index */
    index: Schema.Int,
    /** Title */
    title: Schema.String,
    /** URL */
    url: Schema.String,
    /** Summary */
    summary: Schema.String,
    /** Website name */
    website: Schema.String,
    /** Icon URL */
    icon: Schema.String,
    /** Publication date (if available) */
    publish_date: Schema.optional(Schema.String)
  })).annotations({
    description: "Formatted search results"
  })
});

// =============================================================================
// Error Schemas
// =============================================================================

/**
 * API Error response
 */
export const ApiErrorSchema = Schema.Struct({
  /** Error code */
  code: Schema.Int.annotations({
    description: "Error code"
  }),
  
  /** Error message */
  message: Schema.String.annotations({
    description: "Error message"
  })
});
