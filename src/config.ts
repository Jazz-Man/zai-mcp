import { Effect, Config, Redacted } from "effect";
import * as Schema from "effect/Schema";
import { ConfigError } from "./schemas/common";

/**
 * Configuration interface for Zai MCP Server
 */
export interface ZaiConfig {
  readonly apiKey: Redacted.Redacted;
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly maxRetries: number;
}

/**
 * Zai Config Service using Effect.Service pattern
 */
export class ZaiConfigService extends Effect.Service<ZaiConfigService>()("ZaiConfigService", {
  effect: Effect.gen(function* () {
    const apiKey = yield* Config.redacted("ZAI_API_KEY").pipe(
      Effect.mapError(
        (error) =>
          new ConfigError({
            message: `Failed to load ZAI_API_KEY: ${String(error)}`,
            key: "ZAI_API_KEY"
          })
      )
    );

    const baseUrl = yield* Config.string("ZAI_BASE_URL").pipe(
      Config.withDefault("https://api.zai.ai"),
      Effect.mapError(
        (error) =>
          new ConfigError({
            message: `Failed to load ZAI_BASE_URL: ${String(error)}`,
            key: "ZAI_BASE_URL"
          })
      )
    );

    const timeoutMs = yield* Config.number("ZAI_TIMEOUT_MS").pipe(
      Config.withDefault(30000),
      Effect.mapError(
        (error) =>
          new ConfigError({
            message: `Failed to load ZAI_TIMEOUT_MS: ${String(error)}`,
            key: "ZAI_TIMEOUT_MS"
          })
      )
    );

    const maxRetries = yield* Config.number("ZAI_MAX_RETRIES").pipe(
      Config.withDefault(3),
      Effect.mapError(
        (error) =>
          new ConfigError({
            message: `Failed to load ZAI_MAX_RETRIES: ${String(error)}`,
            key: "ZAI_MAX_RETRIES"
          })
      )
    );

    return { apiKey, baseUrl, timeoutMs, maxRetries } as const;
  })
}) {}

/**
 * Helper to get API key value from config
 */
export const getApiKey = Effect.map(ZaiConfigService, (config) =>
  Redacted.value(config.apiKey)
);

/**
 * Helper to get base URL from config
 */
export const getBaseUrl = Effect.map(ZaiConfigService, (config) => config.baseUrl);

/**
 * Helper to get timeout from config
 */
export const getTimeout = Effect.map(ZaiConfigService, (config) => config.timeoutMs);

/**
 * Helper to get max retries from config
 */
export const getMaxRetries = Effect.map(ZaiConfigService, (config) => config.maxRetries);
