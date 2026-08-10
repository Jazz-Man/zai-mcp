import * as Schema from "effect/Schema";
import * as Tool from "effect/unstable/ai/Tool";
import { WebReaderParamsSchema, WebReaderResponseSchema } from "./schema.ts";

export const WebReaderTool = Tool.make("webReader", {
	description: "Fetch and Convert URL to LLM Friendly Input.",
	failure: Schema.Never,
	parameters: WebReaderParamsSchema,
	success: WebReaderResponseSchema,
})
	.annotate(Tool.Idempotent, false)
	.annotate(Tool.OpenWorld, true)
	.annotate(Tool.Readonly, true)
	.annotate(Tool.Destructive, false);
