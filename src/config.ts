/**
 * Configuration module for Z.AI MCP Server
 *
 * This module uses Effect's Config system for type-safe configuration
 * management from environment variables
 *
 * Environment variables:
 * - ZAI_API_KEY: Required API key for Z.AI services
 * - ZAI_TIMEOUT_MS: Optional timeout in milliseconds (default: 30000)
 * - ZAI_MAX_RETRIES: Optional max retries (default: 3)
 *
 * Base URL is fixed to "https://api.z.ai/api" for all services
 */

import { Config, Context, Effect, Layer, type Redacted, Schema } from "effect";

// =============================================================================
// Configuration Errors
// =============================================================================

/**
 * Error raised when required configuration is missing
 */
export class ConfigError extends Schema.TaggedError<ConfigError>()(
	"ConfigError",
	{
		message: Schema.String,
	},
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
	/** API key for Z.AI services (required, redacted for security) */
	apiKey: Schema.String.annotations({
		description: "Z.AI API key for authentication (redacted)",
		identifier: "ZAI_API_KEY",
	}),

	/** Request timeout in milliseconds */
	timeoutMs: Schema.optional(Schema.Int).annotations({
		description: "Request timeout in milliseconds",
		identifier: "ZAI_TIMEOUT_MS",
		defaultValue: () => 30000,
	}),

	/** Maximum number of retries for failed requests */
	maxRetries: Schema.optional(Schema.Int).annotations({
		description: "Maximum number of retries for failed requests",
		identifier: "ZAI_MAX_RETRIES",
		defaultValue: () => 3,
	}),
});

/**
 * Type representing the Z.AI configuration
 * Note: apiKey is Redacted<string> at runtime due to Config.redacted
 */
export type ZaiConfig = {
	readonly apiKey: Redacted.Redacted<string>;
	readonly timeoutMs: number;
	readonly maxRetries: number;
};

// =============================================================================
// Constants
// =============================================================================

/**
 * Fixed base URL for Z.AI API
 * All services use this endpoint
 */
export const ZAI_API_BASE_URL = "https://api.z.ai/api" as const;

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
	// Load required API key as redacted (secure)
	const apiKey = yield* Config.redacted("ZAI_API_KEY").pipe(
		Effect.mapError(
			(error) =>
				new ConfigError({
					message: `Missing required ZAI_API_KEY environment variable: ${error}`,
				}),
		),
	);

	// Load optional timeout with default
	const timeoutMs = yield* Config.number("ZAI_TIMEOUT_MS").pipe(
		Config.withDefault(30000),
	);

	// Load optional max retries with default
	const maxRetries = yield* Config.number("ZAI_MAX_RETRIES").pipe(
		Config.withDefault(3),
	);

	return {
		apiKey,
		timeoutMs,
		maxRetries,
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
 * console.log(`Using API key: ${config.apiKey.substring(0, 10)}...`);
 * ```
 */
export const getConfig = ZaiConfigService;

/**
 * Get the API key from current configuration
 */
export const getApiKey = Effect.map(getConfig, (config) => config.apiKey);

/**
 * Get timeout settings from current configuration
 */
export const getTimeout = Effect.map(getConfig, (config) => config.timeoutMs);
