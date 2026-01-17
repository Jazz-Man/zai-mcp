import { Schema } from "effect";

/**
 * Common error schemas used across all services
 */

// Configuration errors (missing/invalid environment variables)
export class ConfigError extends Schema.TaggedError<ConfigError>()("ConfigError", {
  message: Schema.String,
  field: Schema.String.pipe(Schema.optional),
}) {}

// Network/transport errors (DNS, connection, timeout)
export class NetworkError extends Schema.TaggedError<NetworkError>()("NetworkError", {
  message: Schema.String,
  endpoint: Schema.String,
  cause: Schema.Unknown.pipe(Schema.optional),
}) {}

// API errors (4xx, 5xx responses from Z.AI API)
export class ApiError extends Schema.TaggedError<ApiError>()("ApiError", {
  code: Schema.Int,
  message: Schema.String,
  endpoint: Schema.String,
}) {}

// Schema validation errors (invalid input/output data)
export class ValidationError extends Schema.TaggedError<ValidationError>()("ValidationError", {
  message: Schema.String,
  path: Schema.String,
  value: Schema.Unknown.pipe(Schema.optional),
}) {}

// Union type for all possible errors in our system
export const ZaiError = Schema.Union(
  ConfigError,
  NetworkError,
  ApiError,
  ValidationError
);

// Helper function to format error messages for MCP clients
export const formatErrorMessage = (error: ConfigError | NetworkError | ApiError | ValidationError): string => {
  switch (error._tag) {
    case "ConfigError":
      return `Configuration Error: ${error.message}`;
    case "NetworkError":
      return `Network Error: ${error.message} (endpoint: ${error.endpoint})`;
    case "ApiError":
      return `API Error (code ${error.code}): ${error.message}`;
    case "ValidationError":
      return `Validation Error at ${error.path}: ${error.message}`;
    default:
      return `Unknown Error: ${JSON.stringify(error)}`;
  }
};
