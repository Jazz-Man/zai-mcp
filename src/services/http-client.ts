import { Effect, Schema, pipe, Redacted } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform";
import { ZaiConfigService } from "../config";
import * as CommonSchema from "../schemas/common";

// Re-export error types for convenience
export type NetworkError = CommonSchema.NetworkError;
export type ApiError = CommonSchema.ApiError;
export const { NetworkError, ApiError, ApiErrorResponseSchema } = CommonSchema;

/**
 * HTTP Client Service for Zai API
 * Handles authentication, base URL, and error mapping
 */
export class ZaiHttpClient extends Effect.Service<ZaiHttpClient>()("ZaiHttpClient", {
  dependencies: [ZaiConfigService],
  effect: Effect.gen(function* () {
    const config = yield* ZaiConfigService;
    const apiKey = Redacted.value(config.apiKey);
    const defaultClient = yield* HttpClient.HttpClient;

    const client = pipe(
      defaultClient,
      HttpClient.mapRequest(HttpClientRequest.prependUrl(config.baseUrl)),
      HttpClient.mapRequest((request) =>
        HttpClientRequest.setHeaders({
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        })(request)
      )
    );

    return {
      /**
       * Make a POST request to the Zai API
       */
      post: <A>(
        endpoint: string,
        body: unknown,
        schema: Schema.Schema<A>
      ): Effect.Effect<A, NetworkError | ApiError, never> =>
        Effect.gen(function* () {
          const response = yield* pipe(
            HttpClientRequest.post(endpoint),
            HttpClientRequest.schemaBodyJson(Schema.Unknown)(body),
            Effect.flatMap(client.execute),
            Effect.mapError((error) =>
              new NetworkError({
                message: `HTTP request failed: ${endpoint}`,
                endpoint,
                cause: error
              })
            )
          );

          // Handle error responses (4xx, 5xx)
          if (response.status >= 400) {
            const errorResponse = yield* pipe(
              HttpClientResponse.schemaBodyJson(ApiErrorResponseSchema)(response),
              Effect.catchAll(() =>
                Effect.succeed({
                  code: String(response.status),
                  message: response.statusText
                } as const)
              ),
              Effect.mapError((error) =>
                new NetworkError({
                  message: `Failed to decode error response: ${String(error)}`,
                  endpoint,
                  cause: error
                })
              )
            );

            return yield* Effect.fail(
              new ApiError({
                code: errorResponse.code,
                message: errorResponse.message,
                endpoint
              })
            );
          }

          // Parse successful response
          const result = yield* pipe(
            HttpClientResponse.schemaBodyJson(schema)(response),
            Effect.mapError((error) =>
              new NetworkError({
                message: `Failed to decode response: ${String(error)}`,
                endpoint,
                cause: error
              })
            )
          );

          return result;
        })
    };
  })
}) {}
