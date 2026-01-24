import { Toolkit } from "@effect/ai";
import { Effect, Layer } from "effect";
import { ZaiHttpClient } from "./services/http-client";
import { WebReaderTool } from "./tools/web-reader";

export const ZaiToolkit = Toolkit.make(WebReaderTool);

export const ZaiToolkitHandlers = ZaiToolkit.toLayer(
	Effect.gen(function* () {
		const client = yield* ZaiHttpClient;
		return {
			webReader: (params) => client.readUrl(params),
		};
	}),
).pipe(Layer.provide(ZaiHttpClient.Default));
