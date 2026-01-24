import * as Schema from "effect/Schema";

/**
 * Base error for all network-related failures
 */
export class NetworkError extends Schema.TaggedError<NetworkError>()(
	"NetworkError",
	{
		message: Schema.String,
		endpoint: Schema.String,
		cause: Schema.Unknown,
	},
) {}

/**
 * Base error for all API-related failures
 */
export class ApiError extends Schema.TaggedError<ApiError>()("ApiError", {
	code: Schema.String,
	message: Schema.String,
	endpoint: Schema.String,
}) {}

/**
 * Error for failed schema validation
 */
export class ValidationError extends Schema.TaggedError<ValidationError>()(
	"ValidationError",
	{
		message: Schema.String,
		field: Schema.String,
		received: Schema.Unknown,
	},
) {}

/**
 * Error for configuration failures
 */
export class ConfigError extends Schema.TaggedError<ConfigError>()(
	"ConfigError",
	{
		message: Schema.String,
		key: Schema.String,
	},
) {}

/**
 * Standard API error response format
 */
export const ApiErrorResponseSchema = Schema.Struct({
	code: Schema.String,
	message: Schema.String,
});

export type ApiErrorResponse = typeof ApiErrorResponseSchema.Type;
