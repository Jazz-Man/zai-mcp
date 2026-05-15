import * as Tool from "@effect/ai/Tool";
import * as Schema from "effect/Schema";
import { WebReaderResponseSchema } from "./schema.ts";

export const WebReaderTool = Tool.make("webReader", {
	description: "Fetch and Convert URL to LLM Friendly Input.",
	failure: Schema.Never,
	parameters: {
		keep_img_data_url: Schema.optional(Schema.Boolean).annotations({
			default: false,
			description: "Keep image data URL (true/false), default is false",
		}),
		no_cache: Schema.optional(Schema.Boolean).annotations({
			default: false,
			description: "Disable cache(true/false), default is false",
		}),
		no_gfm: Schema.optional(Schema.Boolean).annotations({
			default: false,
			description:
				"Disable GitHub Flavored Markdown (true/false), default is false",
		}),
		retain_images: Schema.optional(Schema.Boolean).annotations({
			default: false,
			description: "Retain images (true/false), default is true",
		}),
		return_format: Schema.optional(
			Schema.Literal("markdown", "text"),
		).annotations({
			default: "markdown",
			description:
				"Reader response content type (markdown or text), default is markdown",
		}),
		timeout: Schema.optional(Schema.Number).annotations({
			default: 20,
			description: "Request timeout(unit is second), default is 20",
		}),
		url: Schema.NonEmptyTrimmedString.annotations({
			description: "The URL of the website to fetch and read",
		}),
		with_images_summary: Schema.optional(Schema.Boolean).annotations({
			default: false,
			description: "Include images summary (true/false), default is false",
		}),
		with_links_summary: Schema.optional(Schema.Boolean).annotations({
			default: false,
			description: "Include links summary (true/false), default is false",
		}),
	},
	success: WebReaderResponseSchema,
});

export type WebReaderToolParameters = Tool.Parameters<typeof WebReaderTool>;
