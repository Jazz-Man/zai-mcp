import * as Schema from "effect/Schema";
import * as Tool from "effect/unstable/ai/Tool";
import { WebReaderParamsSchema, WebReaderResponseSchema } from "./schema.ts";

export const WebReaderTool = Tool.make("webReader", {
	description: "Fetch and Convert URL to LLM Friendly Input.",
	failure: Schema.Any,
	failureMode: "return",
	parameters: WebReaderParamsSchema,
	success: WebReaderResponseSchema,
});
