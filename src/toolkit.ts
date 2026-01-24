import { type Tool, Toolkit } from "@effect/ai";
import { Effect, Layer } from "effect";
import { WebReaderTool, WebReaderHandler } from "./tools/web-reader";
import { ZaiHttpClient } from "./services/http-client";

export const ZaiToolkit = Toolkit.make(WebReaderTool);

export const ZaiToolkitHandlers = ZaiToolkit.toLayer(
	Effect.succeed({
		webReader: WebReaderHandler,
	}),
).pipe(Layer.provide(ZaiHttpClient.Default));

export type ToolHandler<T extends Tool.Any> = (
	params: Tool.Parameters<T>,
) => Effect.Effect<Tool.Success<T>, Tool.Failure<T>, Tool.Requirements<T>>;
