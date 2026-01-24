import { type Tool, Toolkit } from "@effect/ai";
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

export type ToolHandler<T extends Tool.Any> = (
	params: Tool.Parameters<T>,
) => Effect.Effect<Tool.Success<T>, Tool.Failure<T>, Tool.Requirements<T>>;
