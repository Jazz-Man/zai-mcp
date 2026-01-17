/**
 * Configuration module for Z.AI MCP Server
 * 
 * This module uses Effect's Config system for type-safe configuration
 * management from environment variables
 * 
 * Environment variables:
 * - ZAI_API_KEY: Required API key for Z.AI services
 * - ZAI_API_BASE_URL: Optional base URL (default: https://api.z.ai/api)
 * - ZAI_TIMEOUT_MS: Optional timeout in milliseconds (default: 30000)
 * - ZAI_MAX_RETRIES: Optional max retries (default: 3)
 */

import { Config, Context, Effect, Layer, Schema } from "effect";

// =============================================================================
// Configuration Errors
// =============================================================================

/**
 * Error raised when required configuration is missing
 */
export class ConfigError extends Schema.TaggedError<ConfigError>()(
  "ConfigError",
  {
    message: Schema.String
  }
) {}

// =============================================================================
// Configuration Schema
// =============================================================================

/**
 * Z.AI API Configuration Schema
 * 
 * This schema defines all configuration options for the Z.AI MCP Server
 */
export const ZaiConfigSchema = Schema.Struct({
  /** API key for Z.AI services (required) */
  apiKey: Schema.String.annotations({
    description: "Z.AI API key for authentication",
    identifier: "ZAI_API_KEY"
  }),
  
  /** Base URL for Z.AI API */
  baseUrl: Schema.optional(Schema.String).annotations({
    description: "Base URL for Z.AI API",
    identifier: "ZAI_API_BASE_URL",
    defaultValue: () => "https://api.z.ai/api"
  }),
  
  /** Request timeout in milliseconds */
  timeoutMs: Schema.optional(Schema.Int).annotations({
    description: "Request timeout in milliseconds",
    identifier: "ZAI_TIMEOUT_MS",
    defaultValue: () => 30000
  }),
  
  /** Maximum number of retries for failed requests */
  maxRetries: Schema.optional(Schema.Int).annotations({
    description: "Maximum number of retries for failed requests",
    identifier: "ZAI_MAX_RETRIES",
    defaultValue: () => 3
  })
});

/**
 * Type representing the Z.AI configuration
 */
export type ZaiConfig = typeof ZaiConfigSchema.Type;

// =============================================================================
// Configuration Service
// =============================================================================

/**
 * ZaiConfig service tag
 * 
 * This service provides access to the Z.AI configuration
 */
export class ZaiConfigService extends Context.Tag("ZaiConfigService")<
  ZaiConfigService,
  ZaiConfig
>() {}

/**
 * Load configuration using Effect's Config system
 * 
 * This Effect loads all configuration from environment variables
 * with proper validation and defaults
 */
const loadConfig = Effect.gen(function* () {
  // Load required API key
  const apiKey = yield* Config.string("ZAI_API_KEY").pipe(
    Effect.mapError((error) => new ConfigError({
      message: `Missing required ZAI_API_KEY environment variable: ${error}`
    }))
  );
  
  // Load optional base URL with default
  const baseUrl = yield* Config.string("ZAI_API_BASE_URL").pipe(
    Config.withDefault("https://api.z.ai/api")
  );
  
  // Load optional timeout with default
  const timeoutMs = yield* Config.number("ZAI_TIMEOUT_MS").pipe(
    Config.withDefault(30000)
  );
  
  // Load optional max retries with default
  const maxRetries = yield* Config.number("ZAI_MAX_RETRIES").pipe(
    Config.withDefault(3)
  );
  
  return {
    apiKey,
    baseUrl,
    timeoutMs,
    maxRetries
  } as const;
});

/**
 * Layer that provides the ZaiConfigService
 * 
 * This layer loads configuration from environment variables
 * and makes it available to the application
 */
export const ZaiConfigLayer = Layer.effect(ZaiConfigService, loadConfig);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the current configuration value
 * 
 * @example
 * ```ts
 * const config = yield* ZaiConfigService;
 * console.log(`Using API endpoint: ${config.baseUrl}`);
 * ```
 */
export const getConfig = ZaiConfigService;

/**
 * Get the API key from current configuration
 */
export const getApiKey = Effect.map(getConfig, (config) => config.apiKey);

/**
 * Get the base URL from current configuration
 */
export const getBaseUrl = Effect.map(getConfig, (config) => config.baseUrl);

/**
 * Get timeout settings from current configuration
 */
export const getTimeout = Effect.map(getConfig, (config) => config.timeoutMs);
