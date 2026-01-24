import * as Tool from "@effect/ai/Tool";
import {
	FetchHttpClient,
	HttpClient,
	HttpClientRequest,
	HttpClientResponse,
} from "@effect/platform";
import { Effect, Redacted } from "effect";
import { ZaiConfigService } from "../config";

import { WebReaderResponseSchema } from "../schemas/web-reader";
import type { WebReaderTool } from "../tools/web-reader";

export class ZaiHttpClient extends Effect.Service<ZaiHttpClient>()(
	"ZaiHttpClient",
	{
		dependencies: [FetchHttpClient.layer, ZaiConfigService.Default],
		effect: Effect.gen(function* () {
			const config = yield* ZaiConfigService;
			const apiKey = Redacted.value(config.apiKey);

			const httpClient = yield* HttpClient.HttpClient;
			const httpClientOk = httpClient.pipe(
				HttpClient.filterStatusOk,
				HttpClient.mapRequest(HttpClientRequest.prependUrl(config.baseUrl)),
				HttpClient.mapRequest(HttpClientRequest.bearerToken(apiKey)),
			);

			const readUrl = Effect.fn("ZaiHttpClientNew.readUrl")(function* (
				params: Tool.Parameters<typeof WebReaderTool>,
			) {
				return yield* HttpClientRequest.post("/coding/paas/v4/reader").pipe(
					HttpClientRequest.bodyJson(params),
					Effect.flatMap(httpClientOk.execute),
					Effect.flatMap(
						HttpClientResponse.schemaBodyJson(WebReaderResponseSchema),
					),
					Effect.orDie,
				);
			});

			return { readUrl } as const;
		}),
	},
) {}
